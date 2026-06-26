import type * as React from 'react';
import type { GameMode } from '@/lib/game';
import { useCallback, useEffect, useState } from 'react';
import { GameContext } from '@/features/game/game-context';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';
import { useGameDiceActions } from '@/features/game/use-game-dice-actions';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';
import { useGameplayHelpers } from '@/features/game/use-gameplay-helpers';
import { useMoveLog } from '@/features/game/use-move-log';
import {
  createInitialState,
} from '@/lib/game';
import {
  clearActiveGame,
  isResumableGame,
  loadRestorableGame,
  saveActiveGame,
} from '@/lib/game/persistence';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => loadRestorableGame());
  const {
    moveLog,
    recordMove,
    resetMoveLog,
    reloadMoveLog,
    persistMoveLog,
  } = useMoveLog();

  const {
    moveAnimation,
    isAnimating,
    doMove,
    doMoveSequence,
    playMove,
  } = useAnimatedMoves(state, setState, recordMove);
  const selectPoint = useGameSelectPoint(setState, isAnimating);
  const clearAITimeout = useComputerOpponent({ state, setState, playMove, isAnimating });
  const { doPassTurn, doRollDice } = useGameDiceActions(setState, isAnimating);

  useEffect(() => {
    if (!state) {
      return;
    }
    if (!isResumableGame(state)) {
      clearActiveGame();
      return;
    }
    saveActiveGame(state);
    persistMoveLog(moveLog);
  }, [state, moveLog, persistMoveLog]);

  const startGame = useCallback((mode: GameMode) => {
    clearAITimeout();
    clearActiveGame();
    resetMoveLog();
    setState(createInitialState(mode));
  }, [clearAITimeout, resetMoveLog]);

  const resumeGame = useCallback(() => {
    const saved = loadRestorableGame();
    if (!saved) {
      return false;
    }
    clearAITimeout();
    reloadMoveLog();
    setState(saved);
    return true;
  }, [clearAITimeout, reloadMoveLog]);

  const resetGame = useCallback(() => {
    clearAITimeout();
    resetMoveLog();
    setState((prev) => {
      if (!prev) {
        return null;
      }
      const next = createInitialState(prev.mode);
      saveActiveGame(next);
      return next;
    });
  }, [clearAITimeout, resetMoveLog]);

  useGameplayHelpers({ state, isAnimating, doRollDice, doMove });

  return (
    <GameContext
      value={{
        state,
        moveLog,
        startGame,
        resumeGame,
        resetGame,
        doRollDice,
        doPassTurn,
        selectPoint,
        doMove,
        doMoveSequence,
        isAnimating,
        moveAnimation,
      }}
    >
      {children}
    </GameContext>
  );
}
