import type { GameState, Move } from '@/lib/game/types';

import { useSyncExternalStore } from 'react';

export type GuidanceKind = 'blunder' | 'hint';

/** Blunder-only verdict facts, used for beginner-friendly copy. Module-private: only referenced by GuidanceSession below. */
type GuidanceVerdict = {
  /** Equity points the played turn gave up vs the engine's best. */
  loss: number;
  /** 1-based rank of the played turn among the engine's candidates. */
  playedRank: number;
  /** Total number of candidate plays the engine compared. */
  candidateCount: number;
  /** Best-first candidate equities (top few). */
  candidateEquities: number[];
  bestEquity: number;
};

/**
 * A single tutoring session — the one state machine behind both the
 * automatic end-of-turn blunder review and user-requested mid-turn hints.
 * See docs/tutor-guidance/DESIGN.md.
 *
 * - `questionState`: the position the user is deciding from ("the question").
 *   Blunder: turn start. Hint: the mid-turn position when asked.
 * - `myMoves`: the user's moves from questionState (full turn / so far).
 * - `engineMoves`: the engine's recommended moves from questionState.
 * - `revealed`: whether the solution is shown. Blunder sessions start
 *   unrevealed (progressive disclosure — never spoil the puzzle); hint
 *   sessions start revealed (the answer was explicitly requested).
 *
 * Callers must pass an owned snapshot for `questionState` (see
 * `cloneGameState`); the store never mutates it.
 */
export type GuidanceSession = {
  id: number;
  kind: GuidanceKind;
  questionState: GameState;
  myMoves: Move[];
  engineMoves: Move[];
  revealed: boolean;
  /**
   * Blunder-only. When the revealed view was opened via "Show my move",
   * only the player's own path is shown — the best move (notation, arrows,
   * details) stays hidden until the player explicitly asks for it.
   */
  revealMineOnly?: boolean;
  /** Which arrow sets the solution view draws. */
  showMine: boolean;
  showEngine: boolean;
  /** Blunder-only. */
  verdict?: GuidanceVerdict;
  /** Hint-only: id of the engine that answered (see GameEngine.id). */
  engineId?: string;
  /** Hint-only: moveLog length when the hint was requested. */
  hintMoveLogLength?: number;
};

let session: GuidanceSession | null = null;
let nextId = 1;
/**
 * True while a completed human turn is waiting on its still-running engine
 * analysis. The game (computer + input) stays paused until the verdict
 * lands — this is what guarantees the tutor actually pauses the game even
 * when the player moves faster than the engine analyzes.
 */
let verdictPending = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSessionSnapshot(): GuidanceSession | null {
  return session;
}

function getVerdictPendingSnapshot(): boolean {
  return verdictPending;
}

export function showGuidance(s: Omit<GuidanceSession, 'id'>) {
  session = { ...s, id: nextId++ };
  emit();
}

export function clearGuidance() {
  if (session === null)
    return;
  session = null;
  emit();
}

/** Clear the session only when it is of the given kind. */
export function clearGuidanceKind(kind: GuidanceKind) {
  if (session?.kind === kind)
    clearGuidance();
}

export function updateGuidance(patch: Partial<Omit<GuidanceSession, 'id'>>) {
  if (session === null)
    return;
  session = { ...session, ...patch };
  emit();
}

/** Imperative read for lifecycle code that can't subscribe. */
export function getGuidance(): GuidanceSession | null {
  return session;
}

export function useGuidance(): GuidanceSession | null {
  return useSyncExternalStore(subscribe, getSessionSnapshot, getSessionSnapshot);
}

export function setGuidanceVerdictPending(v: boolean) {
  if (verdictPending === v)
    return;
  verdictPending = v;
  emit();
}

export function useGuidanceVerdictPending(): boolean {
  return useSyncExternalStore(subscribe, getVerdictPendingSnapshot, getVerdictPendingSnapshot);
}
