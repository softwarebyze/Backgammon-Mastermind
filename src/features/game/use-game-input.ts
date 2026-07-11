import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { resolveDropTarget } from '@/features/game/board-point-layout';
import { previewFromDrag, resolveDragMove } from '@/features/game/drag-move';
import { useGame } from '@/features/game/use-game';
import { confirmAction } from '@/lib/confirm';
import { BEAR_OFF, findMoveSequence, getLegalMoves } from '@/lib/game';
import { BAR_POINT } from '@/lib/game/constants';
import { translate } from '@/lib/i18n';

/** Haptics throw on Android emulators and some devices — never block gameplay. */
function triggerHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

export type DragVisual = {
  from: number;
  boardX: number;
  boardY: number;
};

export type InputNudge = 'roll' | null;

const NUDGE_MS = 2200;

function needsRollFirst(phase: string | undefined): boolean {
  return phase === 'rolling' || phase === 'opening-roll';
}

/* eslint-disable max-lines-per-function -- cohesive input orchestration */
export function useGameInput() {
  const { state, doRollDice, doPassTurn, selectPoint, doMove, doMoveSequence, resetGame, isAnimating } = useGame();
  const turnKey = `${state?.phase}|${state?.currentPlayer}|${state?.dice[0]}|${state?.dice[1]}|${isAnimating}`;
  const [preview, setPreview] = useState<{ key: string; target: number | null }>({
    key: turnKey,
    target: null,
  });
  const previewTarget = preview.key === turnKey ? preview.target : null;
  const setPreviewTarget = useCallback((target: number | null) => {
    setPreview({ key: turnKey, target });
  }, [turnKey]);

  const dragFromRef = useRef<number | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [inputNudge, setInputNudge] = useState<InputNudge>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHumanTurn = !!state
    && !(state.mode === 'vs-computer' && state.currentPlayer === 'black');

  const canInteract = !!state
    && state.phase === 'moving'
    && !isAnimating
    && isHumanTurn;

  const nudgeRoll = useCallback(() => {
    triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    const message = translate('game.nudge.roll_first');
    AccessibilityInfo.announceForAccessibility(message);
    setInputNudge('roll');
    if (nudgeTimerRef.current) {
      clearTimeout(nudgeTimerRef.current);
    }
    nudgeTimerRef.current = setTimeout(() => {
      setInputNudge(null);
      nudgeTimerRef.current = null;
    }, NUDGE_MS);
  }, []);

  useEffect(() => () => {
    if (nudgeTimerRef.current) {
      clearTimeout(nudgeTimerRef.current);
    }
  }, []);

  // Don't show a stale roll nudge after dice are already rolled.
  const activeNudge: InputNudge
    = inputNudge === 'roll' && needsRollFirst(state?.phase) ? 'roll' : null;
  const handlePointPress = useCallback(
    (pointIndex: number) => {
      if (!state || isAnimating) {
        return;
      }
      if (!isHumanTurn) {
        return;
      }
      if (needsRollFirst(state.phase)) {
        nudgeRoll();
        return;
      }
      if (!canInteract) {
        return;
      }

      setPreviewTarget(null);

      if (state.selectedPoint !== null) {
        if (state.selectedPoint === pointIndex) {
          selectPoint(null);
          return;
        }
        const move = state.legalMovesForSelected.find(m => m.to === pointIndex);
        if (move) {
          triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
          doMove(move);
          return;
        }
        const sequence = findMoveSequence(state, state.selectedPoint, pointIndex);
        if (sequence) {
          triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
          doMoveSequence(sequence);
          return;
        }
      }

      triggerHaptic(() => Haptics.selectionAsync());
      selectPoint(pointIndex);
    },
    [state, isAnimating, isHumanTurn, canInteract, doMove, doMoveSequence, selectPoint, setPreviewTarget, nudgeRoll],
  );

  const handlePointPressIn = useCallback(
    (pointIndex: number) => {
      if (!state || state.phase !== 'moving' || state.selectedPoint === null || isAnimating) {
        return;
      }
      const isSingle = state.legalMovesForSelected.some(m => m.to === pointIndex);
      const isCompound = findMoveSequence(state, state.selectedPoint, pointIndex) !== null;
      if (isSingle || isCompound) {
        setPreviewTarget(pointIndex);
      }
    },
    [state, isAnimating, setPreviewTarget],
  );

  const handlePointPressOut = useCallback(() => {
    setPreviewTarget(null);
  }, [setPreviewTarget]);

  /** Fires on touch-down — remind to roll before the drag travels. */
  const handleDragAttempt = useCallback((_from: number) => {
    if (!state || isAnimating || !isHumanTurn) {
      return;
    }
    if (needsRollFirst(state.phase)) {
      nudgeRoll();
    }
  }, [state, isAnimating, isHumanTurn, nudgeRoll]);

  const handleDragStart = useCallback((from: number, boardX: number, boardY: number) => {
    if (!state || isAnimating || !isHumanTurn) {
      return;
    }
    // Already nudged on touch-down — don't lift a checker while waiting to roll.
    if (needsRollFirst(state.phase)) {
      return;
    }
    if (!canInteract) {
      return;
    }
    if (from === BAR_POINT) {
      if (state.bar[state.currentPlayer] === 0) {
        return;
      }
    }
    else {
      const point = state.points[from];
      if (!point || point.player !== state.currentPlayer || point.count === 0) {
        return;
      }
    }
    const legal = getLegalMoves({ ...state, selectedPoint: from }).filter(m => m.from === from);
    if (legal.length === 0) {
      triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      return;
    }
    dragFromRef.current = from;
    selectPoint(from);
    setDragVisual({ from, boardX, boardY });
    triggerHaptic(() => Haptics.selectionAsync());
  }, [state, isAnimating, isHumanTurn, canInteract, selectPoint]);

  const handleDragMove = useCallback((boardX: number, boardY: number, dims: BoardDimensions) => {
    const from = dragFromRef.current;
    if (!state || from === null) {
      return;
    }
    setDragVisual({ from, boardX, boardY });
    setPreviewTarget(previewFromDrag({ state, from, boardX, boardY, dims }));
  }, [state, setPreviewTarget]);

  const handleDragEnd = useCallback((boardX: number, boardY: number, dims: BoardDimensions) => {
    const from = dragFromRef.current;
    dragFromRef.current = null;
    setDragVisual(null);
    setPreviewTarget(null);
    if (!state || from === null || !canInteract) {
      return;
    }
    const target = resolveDropTarget(boardX, boardY, dims);
    if (target === null || target === from) {
      selectPoint(null);
      return;
    }
    const resolved = resolveDragMove(state, from, target);
    if (!resolved) {
      triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      selectPoint(null);
      return;
    }
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    if (resolved.kind === 'single') {
      doMove(resolved.move);
    }
    else {
      doMoveSequence(resolved.moves);
    }
  }, [state, canInteract, doMove, doMoveSequence, selectPoint, setPreviewTarget]);

  const handleDragCancel = useCallback(() => {
    dragFromRef.current = null;
    setDragVisual(null);
    setPreviewTarget(null);
  }, [setPreviewTarget]);

  const handleBearOffPress = useCallback(() => {
    if (!state || state.phase !== 'moving' || state.selectedPoint === null || isAnimating) {
      return;
    }
    const move = state.legalMovesForSelected.find(m => m.to === BEAR_OFF);
    if (move) {
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      doMove(move);
      return;
    }
    const sequence = findMoveSequence(state, state.selectedPoint, BEAR_OFF);
    if (sequence) {
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      doMoveSequence(sequence);
    }
  }, [state, doMove, doMoveSequence, isAnimating]);

  const handleBarPress = useCallback(() => {
    if (!state || isAnimating || !isHumanTurn) {
      return;
    }
    if (needsRollFirst(state.phase)) {
      nudgeRoll();
      return;
    }
    if (!canInteract) {
      return;
    }
    if (state.bar[state.currentPlayer] === 0) {
      return;
    }

    if (state.selectedPoint === 0) {
      selectPoint(null);
      return;
    }

    const barMoves = getLegalMoves(state).filter(m => m.from === 0);
    if (barMoves.length === 0) {
      return;
    }

    triggerHaptic(() => Haptics.selectionAsync());
    selectPoint(0);
  }, [state, isAnimating, isHumanTurn, canInteract, selectPoint, nudgeRoll]);

  const handleBoardPress = useCallback(() => {
    if (!state || state.phase !== 'moving' || isAnimating) {
      return;
    }
    setPreviewTarget(null);
    selectPoint(null);
  }, [state, selectPoint, isAnimating, setPreviewTarget]);

  const handlePassTurn = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    doPassTurn();
  }, [doPassTurn]);

  const handleRoll = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    doRollDice();
  }, [doRollDice]);

  const handleReset = useCallback(() => {
    confirmAction({
      title: 'New Game',
      message: 'Start a new game?',
      confirmLabel: 'New Game',
      destructive: true,
      onConfirm: () => {
        triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
        resetGame();
      },
    });
  }, [resetGame]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return {
    state,
    previewTarget,
    dragVisual,
    inputNudge: activeNudge,
    handlePointPress,
    handlePointPressIn,
    handlePointPressOut,
    handleDragAttempt,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    handleBearOffPress,
    handleBarPress,
    handleBoardPress,
    handleRoll,
    handlePassTurn,
    handleReset,
    handleBack,
  };
}
