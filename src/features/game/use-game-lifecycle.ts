import type { Dispatch, SetStateAction } from 'react';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback } from 'react';

import { createInitialState } from '@/lib/game';
import {
  clearActiveGame,
  isResumableGame,
  loadRestorableGame,
  saveActiveGame,
} from '@/lib/game/persistence';

type Options = {
  clearAITimeout: () => void;
  resetMoveLog: () => void;
  reloadMoveLog: () => void;
  resetTimeline: (initial: GameState) => void;
  clearTimeline: () => void;
  setState: Dispatch<SetStateAction<GameState | null>>;
};

export function useGameLifecycle({
  clearAITimeout,
  resetMoveLog,
  reloadMoveLog,
  resetTimeline,
  clearTimeline,
  setState,
}: Options) {
  const startGame = useCallback((mode: GameMode) => {
    clearAITimeout();
    clearActiveGame();
    resetMoveLog();
    clearTimeline();
    const initial = createInitialState(mode);
    resetTimeline(initial);
    setState(initial);
  }, [clearAITimeout, resetMoveLog, clearTimeline, resetTimeline, setState]);

  const resumeGame = useCallback(() => {
    clearAITimeout();
    let canResume = false;
    setState((current) => {
      if (isResumableGame(current)) {
        canResume = true;
        return current;
      }
      const saved = loadRestorableGame();
      if (!saved) {
        return current;
      }
      reloadMoveLog();
      resetTimeline(saved);
      canResume = true;
      return saved;
    });
    return canResume;
  }, [clearAITimeout, reloadMoveLog, resetTimeline, setState]);

  const resetGame = useCallback(() => {
    clearAITimeout();
    resetMoveLog();
    setState((prev) => {
      if (!prev) {
        return null;
      }
      const next = createInitialState(prev.mode);
      saveActiveGame(next);
      resetTimeline(next);
      return next;
    });
  }, [clearAITimeout, resetMoveLog, resetTimeline, setState]);

  return { startGame, resumeGame, resetGame };
}
