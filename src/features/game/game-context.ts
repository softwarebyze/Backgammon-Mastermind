import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameMode, GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { createContext } from 'react';

export type GameContextType = {
  state: GameState | null;
  moveLog: MoveLogEntry[];
  startGame: (mode: GameMode) => void;
  resumeGame: () => boolean;
  resetGame: () => void;
  doRollDice: () => void;
  doPassTurn: () => void;
  selectPoint: (point: number | null) => void;
  doMove: (move: Move) => void;
  doMoveSequence: (moves: Move[]) => void;
  isAnimating: boolean;
  moveAnimation: MoveAnimationFrame | null;
  resetAnimation: () => void;
};

export const GameContext = createContext<GameContextType | null>(null);
