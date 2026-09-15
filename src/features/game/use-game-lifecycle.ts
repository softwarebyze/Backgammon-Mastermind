import type { Dispatch, SetStateAction } from 'react';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback, useState } from 'react';

import { setOpeningCeremonyHandoff, setOpeningCeremonyVisible } from '@/features/game/opening-ceremony-gate';
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
    setOpeningCeremonyHandoff('hidden');
    setCeremonyKey(k => k + 1);
  }, []);

  const beginSession = useCallback((next: GameState) => {
    clearAITimeout();
    resetAnimation();
    clearActiveGame();
    resetMoveLog();
    clearTimeline();
    bumpCeremony();
    resetTimeline(next);
    setState(next);
  }, [bumpCeremony, clearAITimeout, resetAnimation, resetMoveLog, clearTimeline, resetTimeline, setState]);

  const startGame = useCallback((mode: GameMode) => {
    beginSession(createInitialState(mode));
  }, [beginSession]);

  const startFromPosition = useCallback((next: GameState) => {
    beginSession(next);
  }, [beginSession]);

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

  return { startGame, startFromPosition, resumeGame, resetGame, ceremonyKey };
}
