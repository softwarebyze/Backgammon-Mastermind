import type * as React from 'react';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback, useEffect, useState } from 'react';
import { GameContext } from '@/features/game/game-context';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';

import {
  applyDiceRoll,
  applyOpeningDieRoll,
  createInitialState,
  rollDice,
  rollOpeningDie,
} from '@/lib/game';
import {
  clearActiveGame,
  isResumableGame,
  loadRestorableGame,
  saveActiveGame,
} from '@/lib/game/persistence';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(() => loadRestorableGame());
  const { moveAnimation, isAnimating, doMove, playMove } = useAnimatedMoves(state, setState);
  const selectPoint = useGameSelectPoint(setState, isAnimating);
  const clearAITimeout = useComputerOpponent({ state, setState, playMove, isAnimating });

  useEffect(() => {
    if (!state) {
      return;
    }
    if (!isResumableGame(state)) {
      clearActiveGame();
      return;
    }
    saveActiveGame(state);
  }, [state]);

  const startGame = useCallback((mode: GameMode) => {
    clearAITimeout();
    clearActiveGame();
    setState(createInitialState(mode));
  }, [clearAITimeout]);

  const resumeGame = useCallback(() => {
    const saved = loadRestorableGame();
    if (!saved) {
      return false;
    }
    clearAITimeout();
    setState(saved);
    return true;
  }, [clearAITimeout]);

  const resetGame = useCallback(() => {
    clearAITimeout();
    setState((prev) => {
      if (!prev) {
        return null;
      }
      const next = createInitialState(prev.mode);
      saveActiveGame(next);
      return next;
    });
  }, [clearAITimeout]);

  const doRollDice = useCallback(() => {
    if (isAnimating) {
      return;
    }
    setState((prev) => {
      if (!prev) {
        return prev;
      }
      if (prev.mode === 'vs-computer' && prev.currentPlayer === 'black') {
        return prev;
      }
      if (prev.phase === 'opening-roll') {
        return applyOpeningDieRoll(prev, rollOpeningDie());
      }
      if (prev.phase !== 'rolling') {
        return prev;
      }
      const dice = rollDice();
      return applyDiceRoll(prev, dice);
    });
  }, [isAnimating]);

  return (
    <GameContext
      value={{
        state,
        startGame,
        resumeGame,
        resetGame,
        doRollDice,
        selectPoint,
        doMove,
        isAnimating,
        moveAnimation,
      }}
    >
      {children}
    </GameContext>
  );
}
