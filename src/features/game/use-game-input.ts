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
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const previewTargetRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const boardDimsRef = useRef<BoardDimensions | null>(null);
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

  const setPreviewTargetIfChanged = useCallback((target: number | null) => {
    if (previewTargetRef.current === target) {
      return;
    }
    previewTargetRef.current = target;
    setPreviewTarget(target);
  }, [setPreviewTarget]);

  const setBoardDimensions = useCallback((dims: BoardDimensions) => {
    boardDimsRef.current = dims;
  }, []);

  // Don't show a stale roll nudge after dice are already rolled.
  const activeNudge: InputNudge
    = inputNudge === 'roll' && needsRollFirst(state?.phase) ? 'roll' : null;

  const endDrag = useCallback(() => {
    dragFromRef.current = null;
    previewTargetRef.current = null;
    setDragFrom(null);
    setPreviewTarget(null);
  }, [setPreviewTarget]);

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
    previewTargetRef.current = null;
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

  const handleDragStart = useCallback((from: number, _boardX: number, _boardY: number) => {
    const s = stateRef.current;
    if (!s || isAnimating || !isHumanTurn) {
      return;
    }
    if (needsRollFirst(s.phase)) {
      return;
    }
    if (!canInteract) {
      return;
    }
    if (from === BAR_POINT) {
      if (s.bar[s.currentPlayer] === 0) {
        return;
      }
    }
    else {
      const point = s.points[from];
      if (!point || point.player !== s.currentPlayer || point.count === 0) {
        return;
      }
    }
    const legal = getLegalMoves({ ...s, selectedPoint: from }).filter(m => m.from === from);
    if (legal.length === 0) {
      triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      return;
    }
    dragFromRef.current = from;
    previewTargetRef.current = null;
    selectPoint(from);
    setDragFrom(from);
    triggerHaptic(() => Haptics.selectionAsync());
  }, [isAnimating, isHumanTurn, canInteract, selectPoint]);

  const handleDragMove = useCallback((boardX: number, boardY: number) => {
    const from = dragFromRef.current;
    const s = stateRef.current;
    const dims = boardDimsRef.current;
    if (!s || from === null || !dims) {
      return;
    }
    setPreviewTargetIfChanged(previewFromDrag({ state: s, from, boardX, boardY, dims }));
  }, [setPreviewTargetIfChanged]);

  const handleDragEnd = useCallback((boardX: number, boardY: number) => {
    const from = dragFromRef.current;
    const s = stateRef.current;
    const dims = boardDimsRef.current;
    endDrag();
    if (!s || from === null || !canInteract || !dims) {
      return;
    }
    const target = resolveDropTarget(boardX, boardY, dims);
    if (target === null || target === from) {
      selectPoint(null);
      return;
    }
    const resolved = resolveDragMove(s, from, target);
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
  }, [canInteract, doMove, doMoveSequence, selectPoint, endDrag]);

  const handleDragCancel = useCallback(() => {
    endDrag();
  }, [endDrag]);

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
    dragFrom,
    setBoardDimensions,
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
