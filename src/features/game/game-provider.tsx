import type * as React from 'react';
import type { GameMode, GameState, Move } from '@/lib/game';
import { useCallback, useEffect, useState } from 'react';
import { GameContext } from '@/features/game/game-context';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';

import {
  applyDiceRoll,
  applyMove,
  applyOpeningDieRoll,
  createInitialState,
  getLegalMoves,
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
  const clearAITimeout = useComputerOpponent(state, setState);

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
  }, []);

  const selectPoint = useCallback((point: number | null) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'moving') {
        return prev;
      }
      if (point === null) {
        return { ...prev, selectedPoint: null, legalMovesForSelected: [] };
      }
      const isBar = point === 0 && prev.bar[prev.currentPlayer] > 0;
      const isOwnPoint
        = point > 0
          && prev.points[point].player === prev.currentPlayer
          && prev.points[point].count > 0;
      if (!isBar && !isOwnPoint) {
        return { ...prev, selectedPoint: null, legalMovesForSelected: [] };
      }
      const legal = getLegalMoves({ ...prev, selectedPoint: point }).filter(
        m => m.from === point,
      );
      if (legal.length === 0) {
        return prev;
      }
      return { ...prev, selectedPoint: point, legalMovesForSelected: legal };
    });
  }, []);

  const doMove = useCallback((move: Move) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'moving') {
        return prev;
      }
      return applyMove(prev, move);
    });
  }, []);

  return (
    <GameContext
      value={{ state, startGame, resumeGame, resetGame, doRollDice, selectPoint, doMove }}
    >
      {children}
    </GameContext>
  );
}
