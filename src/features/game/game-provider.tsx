import type * as React from 'react';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useEffect, useState } from 'react';
import { GameContext } from '@/features/game/game-context';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';
import { useGameDiceActions } from '@/features/game/use-game-dice-actions';
import { useGameLifecycle } from '@/features/game/use-game-lifecycle';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';
import { useGameTimeline } from '@/features/game/use-game-timeline';
import { useGameUndoRedo } from '@/features/game/use-game-undo-redo';
import { useGameplayHelpers } from '@/features/game/use-gameplay-helpers';
import { useMoveLog } from '@/features/game/use-move-log';
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
    timeline,
    setTimeline,
    canUndo,
    canRedo,
    resetTimeline,
    clearTimeline,
    recordTimelineMove,
  } = useGameTimeline();

  const handleMoveRecorded = useCallback((snapshot: GameState, move: Move, next: GameState) => {
    recordMove(snapshot, move);
    recordTimelineMove(next);
  }, [recordMove, recordTimelineMove]);

  const {
    moveAnimation,
    isAnimating,
    doMove,
    doMoveSequence,
    playMove,
    resetAnimation,
  } = useAnimatedMoves(state, setState, handleMoveRecorded);
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

  const { startGame, resumeGame, resetGame } = useGameLifecycle({
    clearAITimeout,
    resetMoveLog,
    reloadMoveLog,
    resetTimeline,
    clearTimeline,
    setState,
  });

  const { doUndo, doRedo } = useGameUndoRedo({
    timeline,
    setTimeline,
    setState,
    isAnimating,
    resetAnimation,
  });

  useEffect(() => {
    if (state && timeline === null && isResumableGame(state)) {
      resetTimeline(state);
    }
  }, [state, timeline, resetTimeline]);

  useGameplayHelpers({ state, isAnimating, doRollDice, doMove, doPassTurn });

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
        doUndo,
        doRedo,
        canUndo,
        canRedo,
        isAnimating,
        moveAnimation,
        resetAnimation,
      }}
    >
      {children}
    </GameContext>
  );
}
