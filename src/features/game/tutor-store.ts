import type { GameState, Move } from '@/lib/game/types';

import { useSyncExternalStore } from 'react';

export type TutorBlunderPrompt = {
  id: number;
  /** e.g. "13/11 · 8/5" */
  bestNotation: string;
  loss: number;
  /** Best move sequence to draw as hint arrows. */
  bestMoves: Move[];
  /** Turn-start snapshot to restore for "take back". */
  startState: GameState;
  /** How many move-log entries the blundered turn added (for revert). */
  movesMade: number;
  /** Best-first candidate equities (top few) for the XG-style candidate list. */
  candidateEquities: number[];
  /** 1-based rank of the played turn among all candidates. */
  playedRank: number;
  /** Total number of candidate plays the engine compared. */
  candidateCount: number;
};

let prompt: TutorBlunderPrompt | null = null;
let nextId = 1;
/**
 * True while a completed human turn is waiting on its still-running Sage
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

function getPromptSnapshot(): TutorBlunderPrompt | null {
  return prompt;
}

function getVerdictPendingSnapshot(): boolean {
  return verdictPending;
}

export function showTutorBlunder(p: Omit<TutorBlunderPrompt, 'id'>) {
  prompt = { ...p, id: nextId++ };
  emit();
}

export function clearTutorBlunder() {
  if (prompt === null)
    return;
  prompt = null;
  emit();
}

export function useTutorBlunder(): TutorBlunderPrompt | null {
  return useSyncExternalStore(subscribe, getPromptSnapshot, getPromptSnapshot);
}

export function setTutorVerdictPending(v: boolean) {
  if (verdictPending === v)
    return;
  verdictPending = v;
  emit();
}

export function useTutorVerdictPending(): boolean {
  return useSyncExternalStore(subscribe, getVerdictPendingSnapshot, getVerdictPendingSnapshot);
}
