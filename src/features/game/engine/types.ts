import type { GameState, Move } from '@/lib/game/types';

/**
 * One legal way to play the turn, with its resulting position.
 * Module-private: callers only ever touch candidates through EngineTurnPlan,
 * and the board fingerprint is opaque outside the producing engine.
 */
type EngineTurnCandidate = {
  /**
   * Resulting position fingerprint — opaque to callers, only meaningful to
   * the engine that produced it. The tutor compares the played turn's
   * fingerprint against these to rank the play.
   */
  board: number[];
  /** Cubeless equity for the player on roll after this candidate. */
  equity: number;
};

export type EngineTurnPlan = {
  /** Best full-turn move sequence. */
  moves: Move[];
  /** Equity of the best move for the player on roll. */
  equity: number;
  /** Every legal candidate's resulting board + equity, best first. */
  candidates: EngineTurnCandidate[];
};

/**
 * A swappable backgammon engine. The tutor and the hint button only ever
 * talk to this interface — the concrete engine is chosen once, in
 * `./index.ts`. To swap engines, implement this interface and repoint the
 * swap point; nothing downstream names an engine.
 *
 * Implementations must be side-effect free to import: the native module or
 * WASM is only touched inside the async methods, never at import time, so
 * merely rendering a game screen never pays the cost of — or fails on —
 * the engine.
 */
export type GameEngine = {
  /**
   * Stable id, e.g. 'bgsage'. Used for logging and to tell a real answer
   * from a fallback; never shown to the learner.
   */
  readonly id: string;
  /**
   * Best full-turn plan plus all candidates, best-first. Throws when the
   * engine is unavailable or returns nothing usable — callers fall back to
   * the next engine (hints) or stay silent (tutor) rather than guessing.
   */
  planTurn: (state: GameState) => Promise<EngineTurnPlan>;
  /**
   * Fingerprint of the position after a completed turn, in the same space
   * as `candidates[].board`, so the tutor can find the played turn among
   * the analyzed candidates.
   */
  boardAfterTurn: (state: GameState) => number[];
};
