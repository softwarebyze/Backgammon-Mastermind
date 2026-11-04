import type { Dispatch, SetStateAction } from 'react';
import type { GameAbandonReason } from '@/features/game/use-game-completed-capture';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback } from 'react';

import { clearGuidance, setGuidanceVerdictPending } from '@/features/game/guidance-store';
import { bumpTutorGameGeneration } from '@/features/game/use-tutor';
import { createInitialState } from '@/lib/game';
import { createMatchGame } from '@/lib/game/match';
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
  /** Called before the live game is replaced; it is still `state` here. */
  onNewGame?: (reason: GameAbandonReason) => void;
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
  onNewGame,
}: Options) {
  const beginSession = useCallback((next: GameState) => {
    bumpTutorGameGeneration();
    onNewGame?.('new_game');
    clearAITimeout();
    resetAnimation();
    clearActiveGame();
    resetMoveLog();
    clearTimeline();
    setGuidanceVerdictPending(false);
    clearGuidance();
    savePersistedSession({ state: next, moveLog: [], replayBaseline: null });
    resetTimeline(next);
    setState(next);
  }, [onNewGame, clearAITimeout, resetAnimation, resetMoveLog, clearTimeline, resetTimeline, setState]);

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
    bumpTutorGameGeneration();
    onNewGame?.('reset');
    clearAITimeout();
    resetAnimation();
    resetMoveLog();
    setGuidanceVerdictPending(false);
    clearGuidance();
    if (!state) {
      return;
    }
    const next = state.match ? createMatchGame(state.match.length, state.mode, state.match.crawfordRule !== false) : createInitialState(state.mode);
    if (next.match && state.match) {
      next.match.cubeLimit = state.match.cubeLimit;
      if (state.match.length === 0) {
        next.match.jacoby = state.match.jacoby;
        next.match.beavers = state.match.beavers;
      }
    }
    savePersistedSession({ state: next, moveLog: [], replayBaseline: null });
    resetTimeline(next);
    setState(next);
  }, [onNewGame, clearAITimeout, resetAnimation, resetMoveLog, resetTimeline, setState, state]);

  return { startGame, startFromPosition, resumeGame, resetGame };
}
