import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { HistoryPathOverlay } from '@/features/game/timeline-history-actions';
import type { AnimatedMoveOpts } from '@/features/game/use-animated-moves';
import type { GameMode, GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { createContext } from 'react';

export type GameContextType = {
  state: GameState | null;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
  startGame: (mode: GameMode) => void;
  /** Dev/QA: start a playable session from an arbitrary board (skips opening ceremony). */
  startFromPosition: (state: GameState) => void;
  resumeGame: () => boolean;
  resetGame: () => void;
  /** Remount key for opening ceremony after new/reset game. */
  ceremonyKey: number;
  doRollDice: () => void;
  doPassTurn: () => void;
  selectPoint: (point: number | null) => void;
  doMove: (move: Move, opts?: AnimatedMoveOpts) => void;
  doMoveSequence: (moves: Move[], opts?: AnimatedMoveOpts) => void;
  doUndo: () => void;
  doRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isAnimating: boolean;
  moveAnimation: MoveAnimationFrame | null;
  historyPath: HistoryPathOverlay | null;
  resetAnimation: () => void;
  clearAITimeout: () => void;
  /** Re-arm AI timers after leave-home cancelled them without changing game state. */
  resumeAIScheduling: () => void;
  /** Skip remaining computer think/roll wait. */
  skipAIDelay: () => void;
  /**
   * Tutor mode: revert a blundered turn to its start snapshot, trimming the
   * move log and timeline so history stays consistent. Used for "take back".
   */
  tutorRevertTurn: (startState: GameState, movesMade: number) => void;
};

export const GameContext = createContext<GameContextType | null>(null);
