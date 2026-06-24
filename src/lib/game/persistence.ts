import type { GameState } from './types';
import { getItem, removeItem, setItem } from '@/lib/storage';

const ACTIVE_GAME_KEY = 'ACTIVE_GAME_STATE';

export function isResumableGame(state: GameState | null | undefined): boolean {
  return state != null && state.phase !== 'game-over';
}

export function saveActiveGame(state: GameState): void {
  void setItem(ACTIVE_GAME_KEY, state);
}

export function loadActiveGame(): GameState | null {
  const saved = getItem<GameState>(ACTIVE_GAME_KEY);
  if (!saved) {
    return null;
  }
  if (saved.openingRolls) {
    return saved;
  }
  // ponytail: legacy saves before opening-roll field shipped
  return { ...saved, openingRolls: { white: null, black: null } };
}

export function clearActiveGame(): void {
  removeItem(ACTIVE_GAME_KEY);
}

export function hasSavedGame(): boolean {
  return isResumableGame(loadActiveGame());
}

/** In-progress save from MMKV, or null. Used on cold launch and Resume. */
export function loadRestorableGame(): GameState | null {
  const saved = loadActiveGame();
  return isResumableGame(saved) ? saved : null;
}

/** MMKV save or in-memory state (home may not re-render after back nav). */
export function canContinueSavedGame(liveState: GameState | null | undefined): boolean {
  return isResumableGame(liveState) || hasSavedGame();
}
