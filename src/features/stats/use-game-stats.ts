import type { GameState } from '@/lib/game';
import type { GameStats } from '@/lib/game/stats';

import { useSyncExternalStore } from 'react';
import { loadStats, recordResult, resultFromState, saveStats } from '@/lib/game/stats';

let cached: GameStats | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): GameStats {
  cached ??= loadStats();
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Count a finished game. Call once per game: the game provider does, from the
 * same guard that sends `game_completed`, so review, redo and resume never
 * count a game twice.
 */
export function recordFinishedGame(state: GameState, moves: number): void {
  const result = resultFromState(state, moves);
  if (!result) {
    return;
  }
  cached = recordResult(getSnapshot(), result);
  saveStats(cached);
  listeners.forEach(listener => listener());
}

export function useGameStats(): GameStats {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
