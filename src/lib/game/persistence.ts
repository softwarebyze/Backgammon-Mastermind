import type { MoveLogEntry } from './move-log';
import type { GameState } from './types';
import { getItem, removeItem, setItem } from '@/lib/storage';

const ACTIVE_GAME_KEY = 'ACTIVE_GAME_STATE';
const MOVE_LOG_KEY = 'ACTIVE_GAME_MOVE_LOG';
const REPLAY_BASELINE_KEY = 'ACTIVE_GAME_REPLAY_BASELINE';

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
  removeItem(MOVE_LOG_KEY);
  removeItem(REPLAY_BASELINE_KEY);
}

export function saveReplayBaseline(state: GameState): void {
  void setItem(REPLAY_BASELINE_KEY, state);
}

export function loadReplayBaseline(): GameState | null {
  const saved = getItem<GameState>(REPLAY_BASELINE_KEY);
  if (!saved) {
    return null;
  }
  if (saved.openingRolls) {
    return saved;
  }
  return { ...saved, openingRolls: { white: null, black: null } };
}

export function saveMoveLog(log: MoveLogEntry[]): void {
  void setItem(MOVE_LOG_KEY, log);
}

export function clearMoveLogAndBaseline(): void {
  removeItem(MOVE_LOG_KEY);
  removeItem(REPLAY_BASELINE_KEY);
}

export function loadMoveLog(): MoveLogEntry[] {
  return getItem<MoveLogEntry[]>(MOVE_LOG_KEY) ?? [];
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
