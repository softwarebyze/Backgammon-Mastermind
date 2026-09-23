import type { GameState, Move } from '@/lib/game/types';

import { useSyncExternalStore } from 'react';

export type TutorBlunderPrompt = {
  id: number;
  /** e.g. "13/11 · 8/5" */
  bestNotation: string;
  loss: number;
  /** Best move sequence to play instead. */
  bestMoves: Move[];
  /** Turn-start snapshot to restore for "try again". */
  startState: GameState;
  /** How many move-log entries the blundered turn added (for revert). */
  movesMade: number;
};

let prompt: TutorBlunderPrompt | null = null;
let nextId = 1;
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

function getSnapshot(): TutorBlunderPrompt | null {
  return prompt;
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
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
