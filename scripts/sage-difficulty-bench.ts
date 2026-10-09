import type { ComputerLevel } from '../src/features/game/engine/sage-difficulty.ts';
// Headless strength/latency bench for the computer levels. Loads the
// committed WASM build (public/bgsage) in Node and plays full games with the
// app's own rules (src/lib/game/moves.ts).
//
//   pnpm exec tsx scripts/sage-difficulty-bench.ts [games-per-pairing] [seed] [pairings]
//   pairings: comma list of a:b, e.g. beginner:intermediate,expert:classic
//   A side can also be an ad-hoc config for calibration: t0.2 (1-ply, T=0.2) or p2t0.02.
import type { GameState } from '../src/lib/game/types.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { gameStateToSageBoard, sageBoardToMoves } from '../expo-bgsage/src/board.ts';
import { rescoreWithLookahead } from '../expo-bgsage/src/lookahead.ts';
import { rankCubelessCandidates } from '../expo-bgsage/src/rank-candidates.ts';
import { pickCandidateIndex } from '../src/features/game/engine/sage-difficulty.ts';
import { nextPlannedMove } from '../src/features/game/planned-move.ts';
import { getAIMove } from '../src/lib/game/ai.ts';
import { createPositionState } from '../src/lib/game/create-position.ts';
import { applyDiceRoll, applyMove, getLegalMoves, passTurn } from '../src/lib/game/moves.ts';
import { applyBenchResult, emptyBenchTally, parseBenchSide, scoreBenchGame } from './sage-bench-rules.ts';

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

const ASSETS = path.resolve('public/bgsage');

type Analyze = (board: number[], dice: [number, number], ply: 1 | 2) => Cand[];

async function loadSage(): Promise<Analyze> {
  const src = readFileSync(path.join(ASSETS, 'bgsage.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const factory = new Function('require', '__dirname', `${src};return SageModule;`)(
    createRequire(path.join(ASSETS, 'bgsage.js')),
    ASSETS,
  );
  const mod: Wasm = await factory({ locateFile: (p: string) => path.join(ASSETS, p) });
  const engine = mod._sage_create();
  return (board, [d1, d2], ply) => {
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
  for (const [a, b] of pairings) {
    parseBenchSide(a);
    parseBenchSide(b);
  }
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
    const ref = analyze(before, state.dice, 1);
    const refMs = performance.now() - tRef;
    let endBoard: number[] | null = null;
    let next = state;
    const config = parseBenchSide(level);
    if (config) {
      const { ply, temperature, lookahead } = config;
      try {
        const t0 = performance.now();
        const base = ply === 1 ? ref : analyze(before, state.dice, ply);
        const cands = lookahead
          ? await rescoreWithLookahead(base, async (b, d1, d2) => analyze(b, [d1, d2], 1))
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

  async function playGame(white: Side, black: Side) {
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
    return scoreBenchGame(state);
  }

  const rows: string[] = [];
  for (const [a, b] of pairings) {
    const row = await playPairing({ a, b, games, playGame });
    rows.push(row);
    console.error(row);
  }
  printBench({ seed, games, rows, stats });
}

async function playPairing(args: {
  a: Side;
  b: Side;
  games: number;
  playGame: (white: Side, black: Side) => Promise<ReturnType<typeof scoreBenchGame>>;
}): Promise<string> {
  const tally = emptyBenchTally();
  const t0 = Date.now();
  for (let g = 0; g < args.games; g++) {
    const aIsWhite = g % 2 === 0;
    const white = aIsWhite ? args.a : args.b;
    const black = aIsWhite ? args.b : args.a;
    applyBenchResult(tally, await args.playGame(white, black), aIsWhite);
  }
  return formatPairingRow({ a: args.a, b: args.b, tally, elapsedMs: Date.now() - t0 });
}

function formatPairingRow(row: { a: string; b: string; tally: ReturnType<typeof emptyBenchTally>; elapsedMs: number }): string {
  const { a, b, tally, elapsedMs } = row;
  const denom = tally.scored;
  const p = denom === 0 ? 0 : tally.aWins / denom;
  const se = denom === 0 ? 0 : Math.sqrt(p * (1 - p) / denom);
  const ppg = denom === 0 ? 0 : tally.aPoints / denom;
  return `| ${a} vs ${b} | ${tally.scored} | ${tally.capped} | ${(100 * p).toFixed(1)}% ± ${(196 * se).toFixed(1)} | ${ppg.toFixed(3)} | ${(elapsedMs / 1000).toFixed(0)}s |`;
}

function printBench(report: { seed: number; games: number; rows: string[]; stats: Partial<Record<Side, Stats>> }) {
  const { seed, games, rows, stats } = report;
  console.log(`\nseed ${seed}, ${games} games per pairing\n`);
  console.log('| pairing (A vs B) | scored | capped | A win % (95% CI) | A ppg | wall |');
  console.log('|---|---|---|---|---|---|');
  rows.forEach(r => console.log(r));
  console.log('\n| level | decisions | avg loss/decision (1-ply ref) | blunders ≥0.05 | engine ms p50 / p95 / max | errors | board mismatches |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [level, s] of Object.entries(stats) as [Side, Stats][]) {
    const ms = [...s.ms].sort((x, y) => x - y);
    const q = (f: number) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(f * ms.length))].toFixed(1) : '-');
    const loss = s.decisions === 0 ? '-' : (s.lossSum / s.decisions).toFixed(4);
    const blunders = s.decisions === 0 ? '-' : `${(100 * s.blunders / s.decisions).toFixed(1)}%`;
    console.log(`| ${level} | ${s.decisions} | ${loss} | ${blunders} | ${q(0.5)} / ${q(0.95)} / ${ms.length ? ms[ms.length - 1].toFixed(0) : '-'} | ${s.errors} | ${s.mismatches} |`);
  }
}

void main();
