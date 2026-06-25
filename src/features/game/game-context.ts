import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameMode, GameState, Move } from '@/lib/game';
import { createContext } from 'react';

export type GameContextType = {
  state: GameState | null;
  startGame: (mode: GameMode) => void;
  resumeGame: () => boolean;
  resetGame: () => void;
  doRollDice: () => void;
  selectPoint: (point: number | null) => void;
  doMove: (move: Move) => void;
  isAnimating: boolean;
  moveAnimation: MoveAnimationFrame | null;
};

export const GameContext = createContext<GameContextType | null>(null);
