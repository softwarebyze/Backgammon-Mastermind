import type * as React from 'react';
import type { GameMode, GameState, Move } from '@/lib/game';
import {
  createContext,
  use,
  useCallback,
  useState,
} from 'react';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';

import {
  applyDiceRoll,
  applyMove,
  createInitialState,
  getLegalMoves,
  rollDice,
} from '@/lib/game';

type GameContextType = {
  state: GameState | null;
  startGame: (mode: GameMode) => void;
  resetGame: () => void;
  doRollDice: () => void;
  selectPoint: (point: number | null) => void;
  doMove: (move: Move) => void;
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const clearAITimeout = useComputerOpponent(state, setState);

  const startGame = useCallback((mode: GameMode) => {
    clearAITimeout();
    setState(createInitialState(mode));
  }, [clearAITimeout]);

  const resetGame = useCallback(() => {
    clearAITimeout();
    setState(prev => (prev ? createInitialState(prev.mode) : null));
  }, [clearAITimeout]);

  const doRollDice = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== 'rolling')
        return prev;
      if (prev.mode === 'vs-computer' && prev.currentPlayer === 'black') {
        return prev;
      }
      const dice = rollDice();
      return applyDiceRoll(prev, dice);
    });
  }, []);

  const selectPoint = useCallback((point: number | null) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'moving')
        return prev;
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
      if (legal.length === 0)
        return prev;
      return { ...prev, selectedPoint: point, legalMovesForSelected: legal };
    });
  }, []);

  const doMove = useCallback((move: Move) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'moving')
        return prev;
      return applyMove(prev, move);
    });
  }, []);

  return (
    <GameContext
      value={{ state, startGame, resetGame, doRollDice, selectPoint, doMove }}
    >
      {children}
    </GameContext>
  );
}

export function useGame(): GameContextType {
  const ctx = use(GameContext);
  if (!ctx)
    throw new Error('useGame must be used within GameProvider');
  return ctx;
}
