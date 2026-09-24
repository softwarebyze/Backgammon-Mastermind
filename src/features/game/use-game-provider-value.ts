import type { GameContextType } from '@/features/game/game-context';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useState } from 'react';
import { useGuidance, useGuidanceVerdictPending } from '@/features/game/guidance-store';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';
import { useGameDiceActions } from '@/features/game/use-game-dice-actions';
import { useGameLifecycle } from '@/features/game/use-game-lifecycle';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';
import { useGameTimeline } from '@/features/game/use-game-timeline';
import { useGameUndoRedo } from '@/features/game/use-game-undo-redo';
import { useGameplayHelpers } from '@/features/game/use-gameplay-helpers';
import { useMoveLog } from '@/features/game/use-move-log';
import { usePersistActiveGame } from '@/features/game/use-persist-active-game';
import { useRestoreGameTimeline } from '@/features/game/use-restore-game-timeline';
import { sfxKindsForMove } from '@/lib/game-sfx/move-sfx';
import { playGameSfxSequence } from '@/lib/game-sfx/play-game-sfx';
import { loadPersistedGame } from '@/lib/game/persistence';

/* eslint-disable max-lines-per-function -- provider composes all game slices */
export function useGameProviderValue(): GameContextType {
  const [state, setState] = useState(() => loadPersistedGame());
  const {
    moveLog,
    replayBaseline,
    recordMove,
    recordNoMove,
    resetMoveLog,
    reloadMoveLog,
    popLastMove,
    restoreMove,
  } = useMoveLog(state);
  const { timeline, setTimeline, resetTimeline, clearTimeline, recordTimelineMove } = useGameTimeline();
  const handleMoveRecorded = useCallback((snapshot: GameState, move: Move, next: GameState) => {
    recordMove(snapshot, move, next);
    recordTimelineMove(snapshot, next);
    playGameSfxSequence(sfxKindsForMove(snapshot, move, next));
  }, [recordMove, recordTimelineMove]);
  const {
    moveAnimation,
    isAnimating,
    doMove,
    doMoveSequence,
    playMove,
    resetAnimation,
    armAnimationFinish,
    setMoveAnimation,
  } = useAnimatedMoves(state, setState, handleMoveRecorded);
  const guidance = useGuidance();
  const guidanceVerdictPending = useGuidanceVerdictPending();
  /**
   * Blunder prompt open or a completed turn waiting on its verdict — pause
   * everything. (Hint sessions never pause: the player keeps playing.)
   */
  const tutorPaused = guidance?.kind === 'blunder' || guidanceVerdictPending;
  const selectPoint = useGameSelectPoint(setState, isAnimating);
  const { doUndo, doRedo, canUndo, canRedo, historyPath, clearHistoryPath } = useGameUndoRedo({
    timeline,
    setTimeline,
    setState,
    replayBaseline,
    moveLog,
    isAnimating,
    setMoveAnimation,
    armAnimationFinish,
    popLastMove,
    restoreMove,
    gameMode: state?.mode,
  });
  const { clearAITimeout, resumeAIScheduling, skipAIDelay } = useComputerOpponent({
    state,
    setState,
    playMove,
    isAnimating,
    moveCount: moveLog.length,
    hasRedo: canRedo,
    recordNoMove,
    paused: tutorPaused,
  });
  const { doPassTurn, doRollDice } = useGameDiceActions({
    state,
    setState,
    isAnimating,
    recordNoMove,
  });
  const resetAllAnimation = useCallback(() => {
    resetAnimation();
    clearHistoryPath();
  }, [resetAnimation, clearHistoryPath]);
  usePersistActiveGame(state, moveLog, replayBaseline);
  const { startGame, startFromPosition, resumeGame, resetGame, ceremonyKey } = useGameLifecycle({
    state,
    clearAITimeout,
    resetAnimation: resetAllAnimation,
    resetMoveLog,
    reloadMoveLog,
    resetTimeline,
    clearTimeline,
    setState,
  });
  useRestoreGameTimeline({ state, timeline, moveLog, replayBaseline, resetTimeline, setTimeline });
  useGameplayHelpers({
    state,
    isAnimating,
    hasRedo: canRedo,
    paused: tutorPaused,
    doRollDice,
    doMove,
    doMoveSequence,
    doPassTurn,
  });

  const tutorRevertTurn = useCallback((startState: GameState, movesMade: number) => {
    clearAITimeout();
    resetAllAnimation();
    const n = Math.max(0, Math.min(movesMade, 8));
    for (let i = 0; i < n; i++) {
      popLastMove();
    }
    setTimeline((prev) => {
      if (!prev)
        return prev;
      const newCursor = Math.max(0, prev.cursor - n);
      return {
        snapshots: prev.snapshots.slice(0, newCursor + 1),
        cursor: newCursor,
        redo: [],
        redoMoves: [],
      };
    });
    setState({
      ...startState,
      points: startState.points.map(p => ({ ...p })),
      bar: { ...startState.bar },
      borneOff: { ...startState.borneOff },
      remainingDice: [...startState.remainingDice],
      selectedPoint: null,
      legalMovesForSelected: [],
    });
  }, [clearAITimeout, resetAllAnimation, popLastMove, setTimeline, setState]);

  return {
    state,
    moveLog,
    replayBaseline,
    startGame,
    startFromPosition,
    resumeGame,
    resetGame,
    ceremonyKey,
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
    historyPath,
    resetAnimation: resetAllAnimation,
    clearAITimeout,
    resumeAIScheduling,
    skipAIDelay,
    tutorRevertTurn,
  };
}
