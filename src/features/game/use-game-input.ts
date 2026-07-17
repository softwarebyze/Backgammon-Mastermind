import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { PendingDragDrop } from '@/features/game/pending-drag-drop';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AccessibilityInfo } from 'react-native';

import { resolveDropTarget } from '@/features/game/board-point-layout';
import { validateDragStart } from '@/features/game/drag-input';
import { previewFromDrag, resolveDragMove } from '@/features/game/drag-move';
import { dragReleaseAnchor } from '@/features/game/drag-overlay-offset';
import { resolvePendingDragDrop } from '@/features/game/pending-drag-drop';
import { useGame } from '@/features/game/use-game';
import { confirmAction } from '@/lib/confirm';
import { BEAR_OFF, findMoveSequence, getLegalMoves } from '@/lib/game';
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
  const posthog = usePostHog();
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
  /** Point newly selected on this touch-down — swallow the matching tap so it doesn't re-select. */
  const touchSelectedFromRef = useRef<number | null>(null);
  /**
   * Column GestureDetector taps also hit the wrapping board Pressable on native.
   * Skip one board-press clear after a real point/bar interaction.
   */
  const ignoreNextBoardPressRef = useRef(false);
  const previewTargetRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const boardDimsRef = useRef<BoardDimensions | null>(null);
  const pendingDropRef = useRef<PendingDragDrop | null>(null);
  const wasAnimatingRef = useRef(false);
  const [inputNudge, setInputNudge] = useState<InputNudge>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHumanTurn = !!state
    && !(state.mode === 'vs-computer' && state.currentPlayer === 'black');

  /** Tap / select — blocked while a move animation owns the board state. */
  const canInteract = !!state
    && state.phase === 'moving'
    && !isAnimating
    && isHumanTurn;

  /** Drag may start while another checker is still sliding; drop queues until settle. */
  const canDrag = !!state
    && state.phase === 'moving'
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

  const playResolvedDrag = useCallback((
    resolved: NonNullable<ReturnType<typeof resolveDragMove>>,
    fromAnchor: PendingDragDrop['fromAnchor'],
  ) => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    posthog.capture('move_made', { input_type: 'drag', mode: stateRef.current?.mode ?? null });
    if (resolved.kind === 'single') {
      doMove(resolved.move, { fromAnchor });
    }
    else {
      doMoveSequence(resolved.moves, { fromAnchor });
    }
  }, [posthog, doMove, doMoveSequence]);

  // After an in-flight move commits, play any drop that was queued during the slide.
  useEffect(() => {
    if (wasAnimatingRef.current && !isAnimating) {
      const pending = pendingDropRef.current;
      pendingDropRef.current = null;
      const s = stateRef.current;
      if (pending && s && s.phase === 'moving' && isHumanTurn) {
        const resolved = resolvePendingDragDrop(s, pending);
        if (resolved) {
          playResolvedDrag(resolved, pending.fromAnchor);
        }
        else {
          triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
        }
      }
    }
    wasAnimatingRef.current = isAnimating;
  }, [isAnimating, isHumanTurn, playResolvedDrag]);

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      // Touch-down already selected this source; stale `state` would select again and flicker.
      if (touchSelectedFromRef.current === pointIndex) {
        touchSelectedFromRef.current = null;
        ignoreNextBoardPressRef.current = true;
        return;
      }
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
      ignoreNextBoardPressRef.current = true;

      if (state.selectedPoint !== null) {
        if (state.selectedPoint === pointIndex) {
          selectPoint(null);
          return;
        }
        const move = state.legalMovesForSelected.find(m => m.to === pointIndex);
        if (move) {
          triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
          posthog.capture('move_made', { input_type: 'tap', mode: state.mode });
          doMove(move);
          return;
        }
        const sequence = findMoveSequence(state, state.selectedPoint, pointIndex);
        if (sequence) {
          triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
          posthog.capture('move_made', { input_type: 'tap', mode: state.mode });
          doMoveSequence(sequence);
          return;
        }
      }

      triggerHaptic(() => Haptics.selectionAsync());
      selectPoint(pointIndex);
    },
    [posthog, state, isAnimating, isHumanTurn, canInteract, doMove, doMoveSequence, selectPoint, setPreviewTarget, nudgeRoll],
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

  /** Touch-down: select so legal destinations show before the pan min-distance. */
  const handleDragAttempt = useCallback((from: number) => {
    const s = stateRef.current;
    if (!s || !isHumanTurn) {
      return;
    }
    if (needsRollFirst(s.phase)) {
      nudgeRoll();
      return;
    }
    if (!canDrag) {
      return;
    }
    // Own stack that's a legal target — leave selection alone so the tap can play the move.
    if (s.selectedPoint !== null && s.selectedPoint !== from) {
      const isMoveTarget = s.legalMovesForSelected.some(m => m.to === from)
        || findMoveSequence(s, s.selectedPoint, from) !== null;
      if (isMoveTarget) {
        return;
      }
    }
    const validation = validateDragStart(s, from);
    if (validation !== 'ok') {
      if (validation === 'no-legal-moves') {
        triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      }
      return;
    }
    if (s.selectedPoint === from) {
      return;
    }
    touchSelectedFromRef.current = from;
    ignoreNextBoardPressRef.current = true;
    if (!isAnimating) {
      selectPoint(from);
    }
    triggerHaptic(() => Haptics.selectionAsync());
  }, [isAnimating, isHumanTurn, canDrag, selectPoint, nudgeRoll]);

  /** Pan activated (past min-distance) — lift the checker overlay. */
  const handleDragStart = useCallback((from: number, _boardX: number, _boardY: number) => {
    const s = stateRef.current;
    if (!s || !isHumanTurn) {
      return;
    }
    if (needsRollFirst(s.phase)) {
      return;
    }
    if (!canDrag) {
      return;
    }
    const validation = validateDragStart(s, from);
    if (validation !== 'ok') {
      return;
    }
    touchSelectedFromRef.current = null;
    dragFromRef.current = from;
    previewTargetRef.current = null;
    if (!isAnimating && s.selectedPoint !== from) {
      selectPoint(from);
    }
    setDragFrom(from);
  }, [isAnimating, isHumanTurn, canDrag, selectPoint]);

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
    if (!s || from === null || !canDrag || !dims) {
      endDrag();
      return;
    }
    const target = resolveDropTarget(boardX, boardY, dims);
    if (target === null || target === from) {
      endDrag();
      if (!isAnimating) {
        selectPoint(null);
      }
      return;
    }
    const fromAnchor = dragReleaseAnchor(boardX, boardY, dims.checkerSize);
    if (isAnimating) {
      // State still has the in-flight die — re-resolve after settle.
      pendingDropRef.current = { from, to: target, fromAnchor };
      endDrag();
      return;
    }
    const resolved = resolveDragMove(s, from, target);
    endDrag();
    if (!resolved) {
      triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      selectPoint(null);
      return;
    }
    playResolvedDrag(resolved, fromAnchor);
  }, [canDrag, isAnimating, playResolvedDrag, selectPoint, endDrag]);

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
      posthog.capture('move_made', { input_type: 'bear_off', mode: state.mode });
      doMove(move);
      return;
    }
    const sequence = findMoveSequence(state, state.selectedPoint, BEAR_OFF);
    if (sequence) {
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      posthog.capture('move_made', { input_type: 'bear_off', mode: state.mode });
      doMoveSequence(sequence);
    }
  }, [posthog, state, doMove, doMoveSequence, isAnimating]);

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

    ignoreNextBoardPressRef.current = true;

    if (state.selectedPoint === 0) {
      if (touchSelectedFromRef.current === 0) {
        touchSelectedFromRef.current = null;
        return;
      }
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
    if (ignoreNextBoardPressRef.current) {
      ignoreNextBoardPressRef.current = false;
      return;
    }
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
    posthog.capture('dice_rolled', { mode: state?.mode ?? null, phase: state?.phase ?? null });
    doRollDice();
  }, [posthog, state?.mode, state?.phase, doRollDice]);

  const handleReset = useCallback(() => {
    confirmAction({
      title: 'New Game',
      message: 'Start a new game?',
      confirmLabel: 'New Game',
      destructive: true,
      onConfirm: () => {
        pendingDropRef.current = null;
        triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
        posthog.capture('game_reset', {
          mode: state?.mode ?? null,
          was_game_over: state?.phase === 'game-over',
        });
        resetGame();
      },
    });
  }, [posthog, state?.mode, state?.phase, resetGame]);

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
