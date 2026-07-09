import type { Dispatch, SetStateAction } from 'react';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback, useState } from 'react';

import { setOpeningCeremonyVisible } from '@/features/game/opening-ceremony-gate';
import { createInitialState } from '@/lib/game';
import {
  clearActiveGame,
  isResumableGame,
  loadRestorableGame,
  saveActiveGame,
} from '@/lib/game/persistence';

type Options = {
  clearAITimeout: () => void;
  resetAnimation: () => void;
  resetMoveLog: () => void;
  reloadMoveLog: () => void;
  resetTimeline: (initial: GameState) => void;
  clearTimeline: () => void;
  setState: Dispatch<SetStateAction<GameState | null>>;
};

export function useGameLifecycle({
  clearAITimeout,
  resetAnimation,
  resetMoveLog,
  reloadMoveLog,
  resetTimeline,
  clearTimeline,
  setState,
}: Options) {
  // Remount opening ceremony on each new/reset game (clears stuck exit stage).
  const [ceremonyKey, setCeremonyKey] = useState(0);

  const bumpCeremony = useCallback(() => {
    setOpeningCeremonyVisible(false);
    setCeremonyKey(k => k + 1);
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    clearAITimeout();
    resetAnimation();
    clearActiveGame();
    resetMoveLog();
    clearTimeline();
    bumpCeremony();
    const initial = createInitialState(mode);
    resetTimeline(initial);
    setState(initial);
  }, [bumpCeremony, clearAITimeout, resetAnimation, resetMoveLog, clearTimeline, resetTimeline, setState]);

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
    resetAnimation();
    resetMoveLog();
    bumpCeremony();
    setState((prev) => {
      if (!prev) {
        return null;
      }
      const next = createInitialState(prev.mode);
      saveActiveGame(next);
      resetTimeline(next);
      return next;
    });
  }, [bumpCeremony, clearAITimeout, resetAnimation, resetMoveLog, resetTimeline, setState]);

  return { startGame, resumeGame, resetGame, ceremonyKey };
}
