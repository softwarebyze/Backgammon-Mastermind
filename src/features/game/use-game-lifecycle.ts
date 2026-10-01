import type { Dispatch, SetStateAction } from 'react';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback } from 'react';

import { createInitialState } from '@/lib/game';
import { clearActiveGame, savePersistedSession } from '@/lib/game/persistence';
import { performResume } from '@/lib/game/resume-game';

type Options = {
  state: GameState | null;
  clearAITimeout: () => void;
  resetAnimation: () => void;
  resetMoveLog: () => void;
  reloadMoveLog: () => void;
  resetTimeline: (initial: GameState) => void;
  clearTimeline: () => void;
  setState: Dispatch<SetStateAction<GameState | null>>;
};

export function useGameLifecycle({
  state,
  clearAITimeout,
  resetAnimation,
  resetMoveLog,
  reloadMoveLog,
  resetTimeline,
  clearTimeline,
  setState,
}: Options) {
  const beginSession = useCallback((next: GameState) => {
    clearAITimeout();
    resetAnimation();
    clearActiveGame();
    resetMoveLog();
    clearTimeline();
    savePersistedSession({ state: next, moveLog: [], replayBaseline: null });
    resetTimeline(next);
    setState(next);
  }, [clearAITimeout, resetAnimation, resetMoveLog, clearTimeline, resetTimeline, setState]);

  const startGame = useCallback((mode: GameMode) => {
    beginSession(createInitialState(mode));
  }, [beginSession]);

  const startFromPosition = useCallback((next: GameState) => {
    beginSession(next);
  }, [beginSession]);

  const resumeGame = useCallback(() => {
    return performResume({
      current: state,
      setState,
      clearAITimeout,
      reloadMoveLog,
      resetTimeline,
    });
  }, [clearAITimeout, reloadMoveLog, resetTimeline, setState, state]);

  const resetGame = useCallback(() => {
    clearAITimeout();
    resetAnimation();
    resetMoveLog();
    if (!state) {
      return;
    }
    const next = createInitialState(state.mode);
    savePersistedSession({ state: next, moveLog: [], replayBaseline: null });
    resetTimeline(next);
    setState(next);
  }, [clearAITimeout, resetAnimation, resetMoveLog, resetTimeline, setState, state]);

  return { startGame, startFromPosition, resumeGame, resetGame };
}
