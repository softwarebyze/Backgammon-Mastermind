import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from './types';
import {
  isResumableGame,
  isReviewableGame,
  loadPersistedGame,
} from './persistence';

type ResumeGameDeps = {
  current: GameState | null;
  setState: Dispatch<SetStateAction<GameState | null>>;
  reloadMoveLog: () => void;
  resetTimeline: (initial: GameState) => void;
  clearAITimeout: () => void;
  loadSaved?: () => GameState | null;
};

export function canOpenPersistedGame(state: GameState | null | undefined): boolean {
  return isResumableGame(state) || isReviewableGame(state);
}

/**
 * Resume without reading the return value from a React state updater.
 * Side effects (log + timeline) run before `setState`, so a queued updater
 * cannot drop the result or double-apply mutations.
 */
export function performResume(deps: ResumeGameDeps): boolean {
  deps.clearAITimeout();
  if (canOpenPersistedGame(deps.current)) {
    return true;
  }
  const saved = (deps.loadSaved ?? loadPersistedGame)();
  if (!saved) {
    return false;
  }
  deps.reloadMoveLog();
  deps.resetTimeline(saved);
  deps.setState(saved);
  return true;
}
