import type { GameContextType } from '@/features/game/game-context';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useState } from 'react';
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
import { loadRestorableGame } from '@/lib/game/persistence';

export function useGameProviderValue(): GameContextType {
  const [state, setState] = useState(() => loadRestorableGame());
  const {
    moveLog,
    replayBaseline,
    recordMove,
    recordNoMove,
    resetMoveLog,
    reloadMoveLog,
    persistMoveLog,
    popLastMove,
    restoreMove,
  } = useMoveLog(state);
  const { timeline, setTimeline, resetTimeline, clearTimeline, recordTimelineMove } = useGameTimeline();
  const handleMoveRecorded = useCallback((snapshot: GameState, move: Move, next: GameState) => {
    recordMove(snapshot, move, next);
    recordTimelineMove(snapshot, next);
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
  const { clearAITimeout, resumeAIScheduling } = useComputerOpponent({
    state,
    setState,
    playMove,
    isAnimating,
    moveCount: moveLog.length,
    hasRedo: canRedo,
    recordNoMove,
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
  usePersistActiveGame(state, moveLog, persistMoveLog);
  const { startGame, resumeGame, resetGame, ceremonyKey } = useGameLifecycle({
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
    doRollDice,
    doMove,
    doMoveSequence,
    doPassTurn,
  });
  return {
    state,
    moveLog,
    replayBaseline,
    startGame,
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
  };
}
