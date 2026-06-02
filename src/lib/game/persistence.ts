import type { GameState } from './types';
import { getItem, removeItem, setItem } from '@/lib/storage';

const ACTIVE_GAME_KEY = 'ACTIVE_GAME_STATE';

export function saveActiveGame(state: GameState): void {
  void setItem(ACTIVE_GAME_KEY, state);
}

export function loadActiveGame(): GameState | null {
  return getItem<GameState>(ACTIVE_GAME_KEY);
}

export function clearActiveGame(): void {
  removeItem(ACTIVE_GAME_KEY);
}

export function hasSavedGame(): boolean {
  return loadActiveGame() !== null;
}
