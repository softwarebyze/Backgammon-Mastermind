import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { PendingDragDrop } from '@/features/game/pending-drag-drop';
import type { BoardTapResolution } from '@/features/game/resolve-board-tap';
import type { AnimatedMoveOpts } from '@/features/game/use-animated-moves';
import type { GameState, Move } from '@/lib/game';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AccessibilityInfo } from 'react-native';

import { validateDragStart } from '@/features/game/drag-input';
import { previewFromDrag, resolveDragMove } from '@/features/game/drag-move';
import { dragReleaseAnchor } from '@/features/game/drag-overlay-offset';
import { resolveFatFingerDrop } from '@/features/game/hit-test-board';
import { resolvePendingDragDrop } from '@/features/game/pending-drag-drop';
import { resolveBoardTap } from '@/features/game/resolve-board-tap';
import { BEAR_OFF, findMoveSequence, getLegalMoves } from '@/lib/game';
import { getSingleDestinationSequence } from '@/lib/game/single-move';
import { translate } from '@/lib/i18n';

/** Haptics throw on Android emulators and some devices — never block gameplay. */
function triggerHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

type InputNudge = 'roll' | null;

/**
 * Inputs captured while a move animation owns the board. Replayed in order when
 * it settles, so a fast player can keep tapping through their turn.
 */
type QueuedInput
  = | { kind: 'point'; point: number }
    | { kind: 'dest'; to: number }
    | { kind: 'drag'; from: number; to: number; fromAnchor: PendingDragDrop['fromAnchor'] };

/** Enough for any legal turn; guards against a stuck pointer flooding the queue. */
const MAX_QUEUED_INPUTS = 12;

const NUDGE_MS = 2200;

function needsRollFirst(phase: string | undefined): boolean {
  return phase === 'rolling' || phase === 'opening-roll';
}

type BoardPlayActions = {
  selectPoint: (point: number | null) => void;
  doMove: (move: Move, opts?: AnimatedMoveOpts) => void;
  doMoveSequence: (moves: Move[], opts?: AnimatedMoveOpts) => void;
};

type BoardMoveInputType = 'tap' | 'drag' | 'bear_off';

type UseBoardPlayInputArgs = {
  state: GameState | null;
  isAnimating: boolean;
  isHumanTurn: boolean;
  /** When false, pre-roll taps are ignored (lessons lock dice). Default true. */
  enableRollNudge?: boolean;
  actions: BoardPlayActions;
  /** Optional analytics hook — omitted in Learn (uses its own events). */
  onMoveMade?: (inputType: BoardMoveInputType) => void;
};

/**
 * Shared tap + drag board interaction used by the live game and Learn try-move steps.
 * Callers supply state and move/select actions; chrome (roll/reset) stays elsewhere.
 */
/* eslint-disable max-lines-per-function -- cohesive input orchestration */
export function useBoardPlayInput({
  state,
  isAnimating,
  isHumanTurn,
  enableRollNudge = true,
  actions,
  onMoveMade,
}: UseBoardPlayInputArgs) {
  const { selectPoint, doMove, doMoveSequence } = actions;
  const onMoveMadeRef = useRef(onMoveMade);
  onMoveMadeRef.current = onMoveMade;
  const turnKey = `${state?.phase}|${state?.currentPlayer}|${state?.dice[0]}|${state?.dice[1]}|${isAnimating}`;
  const [preview, setPreview] = useState<{ key: string; target: number | null }>({
    key: turnKey,
    target: null,
  });
  const previewTarget = preview.key === turnKey ? preview.target : null;
  const setPreviewTarget = useCallback((target: number | null) => {
    setPreview({ key: turnKey, target });
  }, [turnKey]);

  /**
   * A drag belongs to one turn. Auto-move can end the turn under a held finger, and the
   * disabled pan never finalizes, so a drag stamped with an older key is dead.
   * The key string can come back (the next turn rolls the same dice), so the gesture
   * is dropped on the change itself and cannot match again.
   */
  const dragTurnKey = `${state?.phase}|${state?.currentPlayer}|${state?.dice[0]}|${state?.dice[1]}|${isHumanTurn}`;
  const dragTurnKeyRef = useRef(dragTurnKey);
  const dragRef = useRef<{ key: string; from: number } | null>(null);
  const [drag, setDrag] = useState<{ key: string; from: number } | null>(null);
  const [dragTurnKeySeen, setDragTurnKeySeen] = useState(dragTurnKey);
  if (dragTurnKeySeen !== dragTurnKey) {
    setDragTurnKeySeen(dragTurnKey);
    dragRef.current = null;
    setDrag(null);
  }
  dragTurnKeyRef.current = dragTurnKey;
  const dragFrom = drag?.key === dragTurnKey ? drag.from : null;
  const liveDragFrom = useCallback(() => {
    const current = dragRef.current;
    return current?.key === dragTurnKeyRef.current ? current.from : null;
  }, []);
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
  const queuedInputsRef = useRef<QueuedInput[]>([]);
  /** A queued input belongs to one roll — never replay it into a new turn or game. */
  const queueTurnKey = `${state?.mode}|${state?.phase}|${state?.currentPlayer}|${state?.dice[0]}|${state?.dice[1]}`;
  const queueTurnKeyRef = useRef(queueTurnKey);
  if (queueTurnKeyRef.current !== queueTurnKey) {
    queueTurnKeyRef.current = queueTurnKey;
    queuedInputsRef.current = [];
  }
  const wasAnimatingRef = useRef(false);
  const isAnimatingRef = useRef(isAnimating);
  isAnimatingRef.current = isAnimating;
  const isHumanTurnRef = useRef(isHumanTurn);
  isHumanTurnRef.current = isHumanTurn;
  const [inputNudge, setInputNudge] = useState<InputNudge>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!enableRollNudge) {
      return;
    }
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
  }, [enableRollNudge]);

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
    dragRef.current = null;
    previewTargetRef.current = null;
    setDrag(null);
    setPreviewTarget(null);
  }, [setPreviewTarget]);

  const playResolvedDrag = useCallback((
    resolved: NonNullable<ReturnType<typeof resolveDragMove>>,
    fromAnchor: PendingDragDrop['fromAnchor'],
  ) => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    onMoveMadeRef.current?.('drag');
    if (resolved.kind === 'single') {
      doMove(resolved.move, { fromAnchor });
    }
    else {
      doMoveSequence(resolved.moves, { fromAnchor });
    }
  }, [doMove, doMoveSequence]);

  const playTapSequence = useCallback((sequence: Move[], inputType: BoardMoveInputType = 'tap') => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    onMoveMadeRef.current?.(inputType);
    if (sequence.length === 1) {
      doMove(sequence[0]!);
    }
    else {
      doMoveSequence(sequence);
    }
  }, [doMove, doMoveSequence]);

  const enqueueInput = useCallback((input: QueuedInput) => {
    if (queuedInputsRef.current.length >= MAX_QUEUED_INPUTS) {
      return;
    }
    queuedInputsRef.current.push(input);
  }, []);

  const clearQueuedInputs = useCallback(() => {
    queuedInputsRef.current = [];
  }, []);

  /** Replay one queued input against the settled board; returns true while the turn continues. */
  const applyBoardTap = useCallback((
    action: BoardTapResolution,
    selection: number | null,
  ): { selection: number | null; stop: boolean } => {
    switch (action.type) {
      case 'nudge':
        nudgeRoll();
        return { selection, stop: true };
      case 'clear':
        if (selection !== null) {
          selectPoint(null);
        }
        return { selection: null, stop: false };
      case 'noop':
        triggerHaptic(() => Haptics.selectionAsync());
        return { selection, stop: false };
      case 'select':
        triggerHaptic(() => Haptics.selectionAsync());
        selectPoint(action.point);
        return { selection: action.point, stop: false };
      case 'play':
        playTapSequence(action.sequence);
        return { selection, stop: true };
    }
  }, [nudgeRoll, playTapSequence, selectPoint]);

  const drainQueuedInputs = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.phase !== 'moving' || !isHumanTurnRef.current) {
      clearQueuedInputs();
      return;
    }

    let selection = s.selectedPoint;
    while (queuedInputsRef.current.length > 0) {
      const live = stateRef.current;
      if (!live || live.phase !== 'moving' || !isHumanTurnRef.current) {
        clearQueuedInputs();
        return;
      }
      const input = queuedInputsRef.current.shift()!;

      if (input.kind === 'drag') {
        const resolved = resolvePendingDragDrop(live, {
          from: input.from,
          to: input.to,
          fromAnchor: input.fromAnchor,
        });
        if (resolved) {
          playResolvedDrag(resolved, input.fromAnchor);
        }
        else if (live.selectedPoint !== null) {
          selectPoint(null);
        }
        return;
      }

      if (input.kind === 'dest') {
        if (selection === null) {
          continue;
        }
        const resolved = resolveDragMove(live, selection, input.to);
        if (resolved) {
          playTapSequence(
            resolved.kind === 'single' ? [resolved.move] : resolved.moves,
            'bear_off',
          );
        }
        return;
      }

      const action = resolveBoardTap(live, selection, input.point);
      const next = applyBoardTap(action, selection);
      selection = next.selection;
      if (next.stop) {
        return;
      }
    }
  }, [applyBoardTap, clearQueuedInputs, playResolvedDrag, playTapSequence, selectPoint]);

  // After an in-flight move commits, replay queued taps, drops, and selections in order.
  useEffect(() => {
    if (wasAnimatingRef.current && !isAnimating) {
      drainQueuedInputs();
    }
    wasAnimatingRef.current = isAnimating;
  }, [isAnimating, drainQueuedInputs]);

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      // Touch-down already selected this source; stale `state` would select again and flicker.
      const swallowTouchSelection = touchSelectedFromRef.current === pointIndex;
      if (swallowTouchSelection) {
        touchSelectedFromRef.current = null;
        ignoreNextBoardPressRef.current = true;
      }

      const live = stateRef.current;
      if (!live || !isHumanTurnRef.current) {
        return;
      }
      if (needsRollFirst(live.phase)) {
        nudgeRoll();
        return;
      }
      // The wrapping board Pressable sees this tap too; always swallow its clear.
      ignoreNextBoardPressRef.current = true;
      if (isAnimatingRef.current) {
        enqueueInput({ kind: 'point', point: pointIndex });
        return;
      }
      if (!canInteract) {
        return;
      }

      setPreviewTarget(null);

      if (swallowTouchSelection && live.phase === 'moving') {
        const sequence = getSingleDestinationSequence(live, pointIndex);
        if (sequence) {
          playTapSequence(sequence);
        }
        return;
      }

      applyBoardTap(resolveBoardTap(live, live.selectedPoint, pointIndex), live.selectedPoint);
    },
    [
      applyBoardTap,
      canInteract,
      enqueueInput,
      nudgeRoll,
      playTapSequence,
      setPreviewTarget,
    ],
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
    const next = { key: dragTurnKeyRef.current, from };
    dragRef.current = next;
    previewTargetRef.current = null;
    if (!isAnimating && s.selectedPoint !== from) {
      selectPoint(from);
    }
    setDrag(next);
  }, [isAnimating, isHumanTurn, canDrag, selectPoint]);

  const handleDragMove = useCallback((boardX: number, boardY: number) => {
    const from = liveDragFrom();
    const s = stateRef.current;
    const dims = boardDimsRef.current;
    if (!s || from === null || !dims) {
      return;
    }
    setPreviewTargetIfChanged(previewFromDrag({ state: s, from, boardX, boardY, dims }));
  }, [liveDragFrom, setPreviewTargetIfChanged]);

  const handleDragEnd = useCallback((boardX: number, boardY: number) => {
    const from = liveDragFrom();
    const s = stateRef.current;
    const dims = boardDimsRef.current;
    if (!s || from === null || !canDrag || !dims) {
      endDrag();
      return;
    }
    const target = resolveFatFingerDrop({ x: boardX, y: boardY, state: s, from, dims });
    if (target === null || target === from) {
      endDrag();
      if (!isAnimatingRef.current) {
        selectPoint(null);
      }
      return;
    }
    const fromAnchor = dragReleaseAnchor(boardX, boardY, dims.checkerSize);
    if (isAnimatingRef.current) {
      // State still has the in-flight die — re-resolve after settle.
      enqueueInput({ kind: 'drag', from, to: target, fromAnchor });
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
  }, [canDrag, enqueueInput, liveDragFrom, playResolvedDrag, selectPoint, endDrag]);

  const handleDragCancel = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleBearOffPress = useCallback(() => {
    const live = stateRef.current;
    if (!live || !isHumanTurnRef.current || live.phase !== 'moving') {
      return;
    }
    if (isAnimatingRef.current) {
      // Resolve against the selection in effect when the queue drains.
      enqueueInput({ kind: 'dest', to: BEAR_OFF });
      return;
    }
    if (live.selectedPoint === null) {
      return;
    }
    const move = live.legalMovesForSelected.find(m => m.to === BEAR_OFF);
    if (move) {
      playTapSequence([move], 'bear_off');
      return;
    }
    const sequence = findMoveSequence(live, live.selectedPoint, BEAR_OFF);
    if (sequence) {
      playTapSequence(sequence, 'bear_off');
    }
  }, [enqueueInput, playTapSequence]);

  const handleBarPress = useCallback(() => {
    const live = stateRef.current;
    if (!live || !isHumanTurnRef.current) {
      return;
    }
    if (needsRollFirst(live.phase)) {
      nudgeRoll();
      return;
    }
    if (!canInteract) {
      if (isAnimatingRef.current && live.bar[live.currentPlayer] > 0) {
        ignoreNextBoardPressRef.current = true;
        enqueueInput({ kind: 'point', point: 0 });
      }
      return;
    }
    if (live.bar[live.currentPlayer] === 0) {
      return;
    }

    ignoreNextBoardPressRef.current = true;

    if (live.selectedPoint === 0) {
      if (touchSelectedFromRef.current === 0) {
        touchSelectedFromRef.current = null;
        const onlyDest = getSingleDestinationSequence(live, 0);
        if (onlyDest) {
          playTapSequence(onlyDest);
        }
        return;
      }
      selectPoint(null);
      return;
    }

    const barMoves = getLegalMoves(live).filter(m => m.from === 0);
    if (barMoves.length === 0) {
      return;
    }

    const onlyDest = getSingleDestinationSequence(live, 0);
    if (onlyDest) {
      playTapSequence(onlyDest);
      return;
    }

    triggerHaptic(() => Haptics.selectionAsync());
    selectPoint(0);
  }, [canInteract, enqueueInput, nudgeRoll, playTapSequence, selectPoint]);

  const handleBoardPress = useCallback(() => {
    if (ignoreNextBoardPressRef.current) {
      ignoreNextBoardPressRef.current = false;
      return;
    }
    const live = stateRef.current;
    if (!live) {
      return;
    }
    if (isAnimatingRef.current) {
      clearQueuedInputs();
      return;
    }
    if (live.phase !== 'moving') {
      return;
    }
    setPreviewTarget(null);
    selectPoint(null);
  }, [clearQueuedInputs, selectPoint, setPreviewTarget]);

  const clearPendingDrop = useCallback(() => {
    clearQueuedInputs();
  }, [clearQueuedInputs]);

  return {
    previewTarget,
    dragFrom,
    setBoardDimensions,
    inputNudge: activeNudge,
    canDrag,
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
    clearPendingDrop,
  };
}
