// Headless strength/latency bench for the computer levels. Loads the
// committed WASM build (public/bgsage) in Node and plays full games with the
// app's own rules (src/lib/game/moves.ts).
//
//   pnpm exec tsx scripts/sage-difficulty-bench.ts [games-per-pairing] [seed] [pairings]
//   pairings: comma list of a:b, e.g. beginner:intermediate,expert:classic
//   A side can also be an ad-hoc config for calibration: t0.2 (1-ply, T=0.2) or p2t0.02.
import type { GameState, Player } from '../src/lib/game/types.ts';
import type { ComputerLevel, SageLevelConfig } from '../src/features/game/engine/sage-difficulty.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { gameStateToSageBoard, sageBoardToMoves } from '../expo-bgsage/src/board.ts';
import { rescoreWithLookahead } from '../expo-bgsage/src/lookahead.ts';
import { rankCubelessCandidates } from '../expo-bgsage/src/rank-candidates.ts';
import { pickCandidateIndex, SAGE_LEVELS } from '../src/features/game/engine/sage-difficulty.ts';
import { nextPlannedMove } from '../src/features/game/planned-move.ts';
import { getAIMove } from '../src/lib/game/ai.ts';
import { createPositionState } from '../src/lib/game/create-position.ts';
import { applyDiceRoll, applyMove, getLegalMoves, passTurn } from '../src/lib/game/moves.ts';

type Wasm = {
  _sage_create: () => number;
  _sage_checkers: (...a: number[]) => number;
  _sage_last_error: () => number;
  UTF8ToString: (p: number) => string;
  _malloc: (n: number) => number;
  _free: (p: number) => void;
  HEAP32: { set: (d: ArrayLike<number>, o: number) => void };
};
type Cand = { board: number[]; equity: number };
type Side = ComputerLevel | `t${string}` | `p2t${string}` | 'lookahead';

type SideConfig = SageLevelConfig & { lookahead?: boolean };

function sideConfig(side: Side): SideConfig | null {
  if (side === 'classic')
    return null;
  if (side === 'lookahead')
    return { ply: 1, temperature: 0, lookahead: true };
  const m = /^(p2)?t([\d.]+)$/.exec(side);
  if (m)
    return { ply: m[1] ? 2 : 1, temperature: Number(m[2]) };
  return SAGE_LEVELS[side as Exclude<ComputerLevel, 'classic'>];
}

const ASSETS = path.resolve('public/bgsage');

async function loadSage(): Promise<(board: number[], d1: number, d2: number, ply: 1 | 2) => Cand[]> {
  const src = readFileSync(path.join(ASSETS, 'bgsage.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const factory = new Function('require', '__dirname', `${src};return SageModule;`)(
    createRequire(path.join(ASSETS, 'bgsage.js')),
    ASSETS,
  );
  const mod: Wasm = await factory({ locateFile: (p: string) => path.join(ASSETS, p) });
  const engine = mod._sage_create();
  return (board, d1, d2, ply) => {
    const ptr = mod._malloc(26 * 4);
    try {
      mod.HEAP32.set(board, ptr >> 2);
      const out = mod._sage_checkers(engine, ptr, d1, d2, ply);
      if (!out)
        throw new Error(`sage: ${mod.UTF8ToString(mod._sage_last_error())}`);
      const json = JSON.parse(mod.UTF8ToString(out));
      if (json.error || !json.moves?.length)
        throw new Error(`sage: ${json.error ?? 'no moves'}`);
      return rankCubelessCandidates(json.moves.map((m: { board: number[]; cubeless_equity: number }) =>
        ({ board: m.board, equity: Number(m.cubeless_equity) })));
    }
    finally {
      mod._free(ptr);
    }
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Stats = { decisions: number; lossSum: number; blunders: number; ms: number[]; errors: number; mismatches: number };
const newStats = (): Stats => ({ decisions: 0, lossSum: 0, blunders: 0, ms: [], errors: 0, mismatches: 0 });

function sameBoard(a: number[], b: number[]) {
  return a.every((v, i) => v === b[i]);
}

async function main() {
  const games = Number(process.argv[2] ?? 200);
  const seed = Number(process.argv[3] ?? 1);
  const pairings = (process.argv[4]
    ?? 'beginner:intermediate,intermediate:advanced,advanced:expert,classic:beginner,classic:intermediate,classic:advanced,classic:expert')
    .split(',')
    .map(p => p.split(':') as [Side, Side]);
  const analyze = await loadSage();
  const rng = mulberry32(seed);
  const die = () => Math.floor(rng() * 6) + 1;
  const stats: Partial<Record<Side, Stats>> = {};
  const st = (l: Side) => (stats[l] ??= newStats());

  /** Plays one full turn for `level`; returns the state after the turn. */
  async function playTurn(state: GameState, level: Side): GameState {
    const before = gameStateToSageBoard(state);
    const s = st(level);
    // 1-ply reference for a uniform error-rate metric across all players.
    const tRef = performance.now();
    const ref = analyze(before, state.dice[0], state.dice[1], 1);
    const refMs = performance.now() - tRef;
    let endBoard: number[] | null = null;
    let next = state;
    const config = sideConfig(level);
    if (config) {
      const { ply, temperature, lookahead } = config;
      try {
        const t0 = performance.now();
        const base = ply === 1 ? ref : analyze(before, state.dice[0], state.dice[1], ply);
        const cands = lookahead
          ? await rescoreWithLookahead(base, async (b, d1, d2) => analyze(b, d1, d2, 1))
          : base;
        s.ms.push((ply === 1 ? refMs : 0) + performance.now() - t0);
        endBoard = cands[pickCandidateIndex(cands, temperature, rng)].board;
        const planned = sageBoardToMoves(state, endBoard).map(m => ({ ...m, die: state.remainingDice[m.dieIndex] }));
        for (let i = 0; i < planned.length; i++) {
          const legal = nextPlannedMove(next, planned.slice(i));
          if (!legal)
            throw new Error(`illegal sage step ${planned[i].from}/${planned[i].to} rem=${next.remainingDice} legal=${getLegalMoves(next).map(l => `${l.from}/${l.to}`).join(' ')}`);
          next = applyMove(next, legal);
        }
        if (next.phase === 'moving' && next.currentPlayer === state.currentPlayer)
          throw new Error(`sage turn left dice unused planned=${JSON.stringify(planned)} rem=${next.remainingDice} legal=${getLegalMoves(next).map(l => `${l.from}/${l.to}`).join(' ')} me=${state.currentPlayer}`);
      }
      catch (e) {
        if (process.env.BENCH_DEBUG)
          console.error(level, String(e), JSON.stringify(before), state.dice);
        s.errors++;
        next = state;
        endBoard = null;
      }
    }
    if (endBoard === null) {
      while (next.phase === 'moving' && next.currentPlayer === state.currentPlayer) {
        const move = getAIMove(next);
        if (!move)
          break;
        next = applyMove(next, move);
      }
    }
    const after = gameStateToSageBoard({ ...next, currentPlayer: state.currentPlayer });
    if (endBoard && !sameBoard(after, endBoard))
      s.mismatches++;
    if (ref.length > 1) {
      const idx = ref.findIndex(c => sameBoard(c.board, after));
      if (idx >= 0) {
        const loss = ref[0].equity - ref[idx].equity;
        s.decisions++;
        s.lossSum += loss;
        if (loss >= 0.05)
          s.blunders++;
      }
    }
    return next.phase === 'no-move' ? passTurn(next) : next;
  }

  async function playGame(white: Side, black: Side): Promise<{ winner: Player; points: number }> {
    let d1 = die();
    let d2 = die();
    while (d1 === d2) {
      d1 = die();
      d2 = die();
    }
    let state = createPositionState({ useStandardSetup: true, currentPlayer: d1 > d2 ? 'white' : 'black', dice: [d1, d2] });
    for (let turns = 0; turns < 2000; turns++) {
      if (state.phase === 'game-over')
        break;
      if (state.phase === 'rolling')
        state = applyDiceRoll(state, [die(), die()]);
      if (state.phase === 'no-move') {
        state = passTurn(state);
        continue;
      }
      state = await playTurn(state, state.currentPlayer === 'white' ? white : black);
    }
    const winner = state.winner!;
    const loser: Player = winner === 'white' ? 'black' : 'white';
    let points = 1;
    if (state.borneOff[loser] === 0) {
      points = 2;
      const winnerHome = winner === 'white' ? [1, 6] : [19, 24];
      let inHome = state.bar[loser] > 0;
      for (let p = winnerHome[0]; p <= winnerHome[1]; p++) {
        if (state.points[p].player === loser)
          inHome = true;
      }
      if (inHome)
        points = 3;
    }
    return { winner, points };
  }

  const rows: string[] = [];
  for (const [a, b] of pairings) {
    let aWins = 0;
    let aPoints = 0;
    const t0 = Date.now();
    for (let g = 0; g < games; g++) {
      const aIsWhite = g % 2 === 0;
      const r = await playGame(aIsWhite ? a : b, aIsWhite ? b : a);
      const aWon = (r.winner === 'white') === aIsWhite;
      if (aWon)
        aWins++;
      aPoints += aWon ? r.points : -r.points;
    }
    const p = aWins / games;
    const se = Math.sqrt(p * (1 - p) / games);
    const row = `| ${a} vs ${b} | ${games} | ${(100 * p).toFixed(1)}% ± ${(196 * se).toFixed(1)} | ${(aPoints / games).toFixed(3)} | ${((Date.now() - t0) / 1000).toFixed(0)}s |`;
    rows.push(row);
    console.error(row);
  }
  console.log(`\nseed ${seed}, ${games} games per pairing\n`);
  console.log('| pairing (A vs B) | games | A win % (95% CI) | A ppg | wall |');
  console.log('|---|---|---|---|---|');
  rows.forEach(r => console.log(r));
  console.log('\n| level | decisions | avg loss/decision (1-ply ref) | blunders ≥0.05 | engine ms p50 / p95 / max | errors | board mismatches |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [level, s] of Object.entries(stats) as [Side, Stats][]) {
    const ms = [...s.ms].sort((x, y) => x - y);
    const q = (f: number) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(f * ms.length))].toFixed(1) : '-');
    console.log(`| ${level} | ${s.decisions} | ${(s.lossSum / s.decisions).toFixed(4)} | ${(100 * s.blunders / s.decisions).toFixed(1)}% | ${q(0.5)} / ${q(0.95)} / ${ms.length ? ms[ms.length - 1].toFixed(0) : '-'} | ${s.errors} | ${s.mismatches} |`);
  }
}

void main();
