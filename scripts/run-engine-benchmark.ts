/**
 * Offline engine benchmark for Backgammon Mastermind.
 *
 * Runs self-play suites, opening/tactical agreement checks, and timing probes,
 * then writes JSON consumed by `public/engine-benchmark.html`.
 *
 * Usage: pnpm benchmark:engine
 */
import type { GameState, Move } from '../src/lib/game/types';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';
import { AI_DEFAULT_DEPTH, getAIMove } from '../src/lib/game/ai';
import {
  OPENING_CASES,
  openingState,
  TACTIC_CASES,
  tacticState,
} from '../src/lib/game/benchmark-positions';
import { createPositionState } from '../src/lib/game/create-position';
import {
  applyDiceRoll,
  applyMove,
  getLegalMoves,
  passTurn,
  rollDice,
} from '../src/lib/game/moves';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_JSON = join(ROOT, 'public', 'engine-benchmark-data.json');

const MAX_PLIES = 220;

type EngineId = 'mastermind' | 'random' | 'greedy';

type SelfPlayResult = {
  games: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  avgPlies: number;
  elapsedMs: number;
};

type AgreementCaseResult = {
  id: string;
  label: string;
  dice: [number, number];
  matched: boolean;
  expected: string;
  actual: string[];
  legalMoveCount: number;
  elapsedMs: number;
  note?: string;
};

type SelfPlayOpts = {
  white: EngineId;
  black: EngineId;
  games: number;
  depth: number;
};

function formatPly(move: Move): string {
  const from = move.from === 0 ? 'bar' : String(move.from);
  const to = move.to === 25 ? 'off' : String(move.to);
  return `${from}→${to}`;
}

function sequencesMatch(played: string[], accepted: string[][]): boolean {
  return accepted.some((seq) => {
    if (seq.length === played.length && seq.every((s, i) => s === played[i])) {
      return true;
    }
    // Soft compound: e.g. accepted ["24→13"] matches 24→18, 18→13.
    if (seq.length === 1 && played.length >= 1) {
      const parts = seq[0]!.split('→');
      if (parts.length !== 2)
        return false;
      const [a, b] = parts;
      const start = played[0]!.split('→')[0];
      const end = played[played.length - 1]!.split('→')[1];
      return start === a && end === b;
    }
    return false;
  });
}

function chooseRandomMove(state: GameState): Move | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0)
    return null;
  return moves[Math.floor(Math.random() * moves.length)] ?? null;
}

function chooseMove(engine: EngineId, state: GameState, depth: number): Move | null {
  if (engine === 'random')
    return chooseRandomMove(state);
  if (engine === 'greedy')
    return getAIMove(state, 1);
  return getAIMove(state, depth);
}

function playFullTurn(
  state: GameState,
  engine: EngineId,
  depth: number,
): { state: GameState; plies: Move[] } {
  const plies: Move[] = [];
  let s = state;

  while (s.phase === 'moving') {
    const move = chooseMove(engine, s, depth);
    if (!move)
      break;
    plies.push(move);
    s = applyMove(s, move);
  }

  if (s.phase === 'no-move') {
    s = passTurn(s);
  }

  return { state: s, plies };
}

function playGame(opts: {
  white: EngineId;
  black: EngineId;
  depth: number;
  seedOffset: number;
}): { winner: 'white' | 'black' | null; plies: number } {
  const { white, black, depth, seedOffset } = opts;
  for (let i = 0; i < seedOffset % 23; i++)
    Math.random();

  let state = createPositionState({
    useStandardSetup: true,
    currentPlayer: 'white',
    mode: 'vs-computer',
  });
  state = applyDiceRoll(state, rollDice());
  let plies = 0;

  while (plies < MAX_PLIES && state.phase !== 'game-over' && !state.winner) {
    if (state.phase === 'rolling') {
      state = applyDiceRoll(state, rollDice());
      if (state.phase === 'no-move') {
        state = passTurn(state);
      }
      continue;
    }

    if (state.phase === 'no-move') {
      state = passTurn(state);
      continue;
    }

    if (state.phase !== 'moving')
      break;

    const engine = state.currentPlayer === 'white' ? white : black;
    const beforePlayer = state.currentPlayer;
    const result = playFullTurn(state, engine, depth);
    state = result.state;
    plies += Math.max(1, result.plies.length);

    // Safety: if the engine made no progress, pass.
    if (state.currentPlayer === beforePlayer && state.phase === 'moving') {
      state = passTurn(state);
    }
  }

  return { winner: state.winner, plies };
}

function runSelfPlay(opts: SelfPlayOpts): SelfPlayResult {
  const { white, black, games, depth } = opts;
  const started = performance.now();
  let whiteWins = 0;
  let blackWins = 0;
  let draws = 0;
  let pliesSum = 0;

  for (let i = 0; i < games; i++) {
    const { winner, plies } = playGame({
      white,
      black,
      depth,
      seedOffset: i * 31 + 7,
    });
    pliesSum += plies;
    if (winner === 'white')
      whiteWins += 1;
    else if (winner === 'black')
      blackWins += 1;
    else draws += 1;
  }

  return {
    games,
    whiteWins,
    blackWins,
    draws,
    avgPlies: Math.round((pliesSum / games) * 10) / 10,
    elapsedMs: Math.round(performance.now() - started),
  };
}

function checkOpenings(depth: number): AgreementCaseResult[] {
  return OPENING_CASES.map((c) => {
    const started = performance.now();
    const state = openingState(c.dice);
    const legalMoveCount = getLegalMoves(state).length;
    const { plies } = playFullTurn(state, 'mastermind', depth);
    const actual = plies.map(formatPly);
    const matched = sequencesMatch(actual, c.acceptedSequences);
    return {
      id: c.id,
      label: `Opening ${c.id}`,
      dice: c.dice,
      matched,
      expected: c.acceptedSequences.map(s => s.join(', ')).join(' | '),
      actual,
      legalMoveCount,
      elapsedMs: Math.round((performance.now() - started) * 100) / 100,
      note: c.note,
    };
  });
}

function checkTactics(depth: number): AgreementCaseResult[] {
  return TACTIC_CASES.map((c) => {
    const started = performance.now();
    const state = tacticState(c);
    const legalMoveCount = getLegalMoves(state).length;
    const { plies } = playFullTurn(state, 'mastermind', depth);
    const actual = plies.map(formatPly);
    const first = actual[0] ?? '';
    const matched = c.mustIncludeFirstPly.includes(first);
    return {
      id: c.id,
      label: c.id,
      dice: c.dice,
      matched,
      expected: c.mustIncludeFirstPly.join(' | '),
      actual,
      legalMoveCount,
      elapsedMs: Math.round((performance.now() - started) * 100) / 100,
      note: c.description,
    };
  });
}

function runTimingProbes(depth: number) {
  const probes = [
    { label: 'Opening 3-1', state: openingState([3, 1]) },
    { label: 'Opening 6-5', state: openingState([6, 5]) },
    { label: 'Tactic hit-blot', state: tacticState(TACTIC_CASES[0]!) },
  ];

  return probes.map(({ label, state }) => {
    const legalMoves = getLegalMoves(state).length;
    const started = performance.now();
    playFullTurn(state, 'mastermind', depth);
    return {
      label,
      depth,
      legalMoves,
      elapsedMs: Math.round((performance.now() - started) * 100) / 100,
    };
  });
}

function winRate(result: SelfPlayResult, side: 'white' | 'black'): number {
  const wins = side === 'white' ? result.whiteWins : result.blackWins;
  return Math.round((wins / result.games) * 1000) / 10;
}

function buildComparison(depth: number) {
  return [
    {
      name: 'eXtreme Gammon (XG)',
      tier: 'World-class',
      method: 'Neural net + multi-ply / rollouts',
      typicalStrength: 'De-facto analysis reference; near top human+ level',
      openSource: false,
      vsMastermind:
        'Far stronger — equity rollouts and Magriel-grade openings vs shallow heuristics',
    },
    {
      name: 'GNU Backgammon',
      tier: 'Strong club / expert',
      method: 'Neural net (0–2 ply) + rollouts',
      typicalStrength: 'Long-standing free standard; beats most humans at 2-ply',
      openSource: true,
      vsMastermind:
        'Much stronger — trained contact/racing nets vs hand-tuned evaluator',
    },
    {
      name: 'BGBlitz',
      tier: 'Strong',
      method: 'Neural net',
      typicalStrength: 'Competitive bot lineage with learned evaluation',
      openSource: false,
      vsMastermind: 'Stronger — learned evaluation dwarfs depth-limited search',
    },
    {
      name: 'Backgammon Mastermind (this app)',
      tier: 'Casual / intermediate teaching bot',
      method: `Heuristic sequence search, depth ${depth}`,
      typicalStrength: 'Beats random & shallow greedy; imperfect on expert openings',
      openSource: true,
      vsMastermind: 'Baseline under test',
    },
    {
      name: 'Random legal mover',
      tier: 'Baseline',
      method: 'Uniform random among legal plays',
      typicalStrength: 'Floor for any search bot',
      openSource: true,
      vsMastermind: 'Mastermind dominates in the self-play suite',
    },
  ];
}

function buildPayload(depth: number) {
  const vsRandomAsWhite = runSelfPlay({
    white: 'mastermind',
    black: 'random',
    games: 36,
    depth,
  });
  console.log(`  vs random (MM white): ${winRate(vsRandomAsWhite, 'white')}% (${vsRandomAsWhite.elapsedMs}ms)`);

  const vsRandomAsBlack = runSelfPlay({
    white: 'random',
    black: 'mastermind',
    games: 36,
    depth,
  });
  console.log(`  vs random (MM black): ${winRate(vsRandomAsBlack, 'black')}% (${vsRandomAsBlack.elapsedMs}ms)`);

  const vsGreedyAsWhite = runSelfPlay({
    white: 'mastermind',
    black: 'greedy',
    games: 20,
    depth,
  });
  console.log(`  vs greedy (MM white): ${winRate(vsGreedyAsWhite, 'white')}% (${vsGreedyAsWhite.elapsedMs}ms)`);

  const vsGreedyAsBlack = runSelfPlay({
    white: 'greedy',
    black: 'mastermind',
    games: 20,
    depth,
  });
  console.log(`  vs greedy (MM black): ${winRate(vsGreedyAsBlack, 'black')}% (${vsGreedyAsBlack.elapsedMs}ms)`);

  const openings = checkOpenings(depth);
  const tactics = checkTactics(depth);
  const openingHit = openings.filter(o => o.matched).length;
  const tacticHit = tactics.filter(t => t.matched).length;
  console.log(`  opening agreement: ${openingHit}/${openings.length}`);
  console.log(`  tactic agreement: ${tacticHit}/${tactics.length}`);

  const timing = runTimingProbes(depth);

  const vsRandomCombined
    = (vsRandomAsWhite.whiteWins + vsRandomAsBlack.blackWins)
      / (vsRandomAsWhite.games + vsRandomAsBlack.games);
  const vsGreedyCombined
    = (vsGreedyAsWhite.whiteWins + vsGreedyAsBlack.blackWins)
      / (vsGreedyAsWhite.games + vsGreedyAsBlack.games);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      engineName: 'Backgammon Mastermind',
      engineVersion: 'heuristic-search',
      searchDepth: depth,
      evaluator: 'pip + blot + made points + prime + bar + borne-off heuristics',
      notes: [
        'Self-play uses the live TypeScript engine (no neural net, no Monte-Carlo equity rollouts).',
        'Expert opening targets follow Magriel / standard theory for common rolls.',
        'Comparisons to eXtreme Gammon / GNU Backgammon / BGBlitz are literature-based characterizations, not live Elo matches in this suite.',
      ],
    },
    selfPlay: {
      vsRandom: {
        asWhite: vsRandomAsWhite,
        asBlack: vsRandomAsBlack,
        combinedWinRatePct: Math.round(vsRandomCombined * 1000) / 10,
      },
      vsGreedy: {
        asWhite: vsGreedyAsWhite,
        asBlack: vsGreedyAsBlack,
        combinedWinRatePct: Math.round(vsGreedyCombined * 1000) / 10,
      },
    },
    agreement: {
      openings: {
        matched: openingHit,
        total: openings.length,
        ratePct: Math.round((openingHit / openings.length) * 1000) / 10,
        cases: openings,
      },
      tactics: {
        matched: tacticHit,
        total: tactics.length,
        ratePct: Math.round((tacticHit / tactics.length) * 1000) / 10,
        cases: tactics,
      },
    },
    timing,
    comparison: buildComparison(depth),
  };
}

function main() {
  const depth = AI_DEFAULT_DEPTH;
  console.log(`Running engine benchmark (depth=${depth})…`);
  const payload = buildPayload(depth);
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUT_JSON}`);
}

main();
