// TypeScript API for the bgsage engine.
//
// The structural types below mirror Backgammon Mastermind's
// src/lib/game/types.ts (Player, BoardPoint, Move, GameState). They are
// declared locally so this module doesn't depend on the host app; the app's
// GameState and Move are assignable to these.
import type { SageGameState, SageMove } from './board';
import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { gameStateToSageBoard, sageBoardToMoves, SageEngineError } from './board';
import { rankCubelessCandidates } from './rank-candidates';

export type { SageBoardPoint, SageGameState, SageMove, SagePlayer } from './board';
export { decomposePlayerOnRollBoard, gameStateToSageBoard, sageBoardToMoves, SageEngineError } from './board';

// Lazily resolved so that importing this module never throws when the native
// side isn't linked (e.g. Expo Go) — only actual engine calls fail. Callers
// then offer no hint.
//
// Platform routing:
//   iOS / Android -> the Expo native module (Swift/Kotlin -> C ABI).
//   web           -> the WebAssembly build, lazy-loaded by ./web-engine
//                    (~13MB of weights download on first use).
// Positional on purpose: these match the native module's AsyncFunction args.
type SageEngineApi = {
  // eslint-disable-next-line max-params
  analyzeCheckers: (board: number[], die1: number, die2: number, ply: number) => Promise<string>;
  // eslint-disable-next-line max-params
  analyzeCube: (board: number[], cubeValue: number, cubeOwner: number, ply: number) => Promise<string>;
};

let cachedApi: SageEngineApi | null = null;
async function engineApi(): Promise<SageEngineApi> {
  if (cachedApi)
    return cachedApi;
  if (Platform.OS === 'web') {
    const web = await import('./web-engine');
    cachedApi = {
      analyzeCheckers: web.analyzeCheckers,
      analyzeCube: web.analyzeCube,
    };
    return cachedApi;
  }
  try {
    cachedApi = requireNativeModule('Bgsage') as SageEngineApi;
  }
  catch (e) {
    throw new SageEngineError(`Bgsage native module is not linked: ${String(e)}`);
  }
  return cachedApi;
}

// ---- public API ----
export type SageTurnCandidate = {
  /** Resulting board (bgsage 26-array, player-on-roll perspective). */
  board: number[];
  /** Cubeless equity for the player on roll after this candidate. */
  equity: number;
};

export type SageTurnPlan = {
  /** Best full-turn move sequence, Mastermind-style (dieIndex into state.remainingDice). */
  moves: SageMove[];
  /** Cubeless equity of the best move for the player on roll. */
  equity: number;
  /** Every legal candidate's resulting board + equity, best first. */
  candidates: SageTurnCandidate[];
};

/**
 * Ask the engine for the full checker-play turn, with equities. Returns the
 * best move sequence plus every candidate's resulting board and equity
 * (best first) — the candidate list powers tutor-mode blunder detection
 * (equity loss of the played move vs the engine's best).
 * Throws SageEngineError when the engine is unavailable or its output can't
 * be decomposed. Callers offer no hint and the tutor stays silent.
 */
export async function planSageTurnFull(state: SageGameState, ply: 1 | 2 = 2): Promise<SageTurnPlan> {
  const candidates = await analyzeSageBoard(gameStateToSageBoard(state), state.dice[0], state.dice[1], ply);
  const moves = sageBoardToMoves(state, candidates[0].board);
  return { moves, equity: candidates[0].equity, candidates };
}

/**
 * Every legal candidate for the player on roll of a raw bgsage board,
 * best-first by cubeless equity. Throws SageEngineError like planSageTurnFull.
 */
// Positional on purpose: matches the native module's analyzeCheckers.
// eslint-disable-next-line max-params
export async function analyzeSageBoard(
  board: number[],
  d1: number,
  d2: number,
  ply: 1 | 2,
): Promise<SageTurnCandidate[]> {
  let raw: string;
  try {
    raw = await (await engineApi()).analyzeCheckers(board, d1, d2, ply);
  }
  catch (e) {
    throw new SageEngineError(`sage analyzeCheckers failed: ${String(e)}`);
  }
  const json = JSON.parse(raw);
  if (json.error || !json.moves || json.moves.length === 0) {
    throw new SageEngineError(`sage returned no moves: ${json.error ?? String(raw).slice(0, 120)}`);
  }
  // The app has no doubling cube, so tutor loss and the suggested play use
  // cubeless equity. The native engine orders its JSON by cubeful equity;
  // those rankings can differ. Keep every learner-facing result consistent.
  return rankCubelessCandidates(json.moves.map(
    (m: { board: number[]; cubeless_equity: number }) => ({
      board: m.board,
      equity: Number(m.cubeless_equity),
    }),
  ));
}

/**
 * Ask the engine for the full checker-play turn. Returns Mastermind-style
 * Moves (with dieIndex into state.remainingDice) ready to animate.
 * Throws SageEngineError when the engine is unavailable or its output can't
 * be decomposed. Callers offer no hint.
 */
export async function planSageTurn(state: SageGameState, ply: 1 | 2 = 2): Promise<SageMove[]> {
  return (await planSageTurnFull(state, ply)).moves;
}

export type SageCubeVerdict = {
  action: string;
  shouldDouble: boolean;
  shouldTake: boolean;
  equityNoDouble: number;
  equityDoubleTake: number;
  equityDoublePass: number;
};

/**
 * Cube decision for the player on roll. cubeOwner: 0 = centered, 1 = player
 * on roll owns the cube, 2 = opponent owns it. (Mastermind has no doubling
 * cube yet — this is ready for when one is added.)
 */
// Positional on purpose: cubeValue, cubeOwner, and ply match the native module.
// eslint-disable-next-line max-params
export async function sageCubeDecision(
  state: SageGameState,
  cubeValue: number,
  cubeOwner: 0 | 1 | 2,
  ply: 1 | 2 = 2,
): Promise<SageCubeVerdict> {
  const board = gameStateToSageBoard(state);
  const raw: string = await (await engineApi()).analyzeCube(board, cubeValue, cubeOwner, ply);
  const j = JSON.parse(raw);
  if (j.error)
    throw new SageEngineError(`sage cube failed: ${j.error}`);
  return {
    action: j.optimal_action ?? 'unknown',
    shouldDouble: !!j.should_double,
    shouldTake: !!j.should_take,
    equityNoDouble: +j.equity_nd,
    equityDoubleTake: +j.equity_dt,
    equityDoublePass: +j.equity_dp,
  };
}
