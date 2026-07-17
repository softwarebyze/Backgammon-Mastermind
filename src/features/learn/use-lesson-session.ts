import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState } from '@/lib/game/types';
import type { TxKeyPath } from '@/lib/i18n';
import type { LessonDefinition, LessonStep } from '@/lib/learn/curriculum';

import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveDropTarget } from '@/features/game/board-point-layout';
import { validateDragStart } from '@/features/game/drag-input';
import { previewFromDrag } from '@/features/game/drag-move';
import { BEAR_OFF } from '@/lib/game/constants';
import { createPositionState } from '@/lib/game/create-position';
import { applyMove, getLegalMoves, getReachableDestinations } from '@/lib/game/moves';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import {
  resolveAcceptedMove,
  validateIdentify,
  validateTryMove,
} from '@/lib/learn/validate-step';

export type LessonFeedback = {
  tone: 'hint' | 'praise' | 'soft';
  messageKey: TxKeyPath;
};

function buildState(step: LessonStep): GameState {
  return createPositionState(step.position);
}

function selectSource(state: GameState, point: number): GameState {
  const isBar = point === 0 && state.bar[state.currentPlayer] > 0;
  const isOwn
    = point > 0
      && state.points[point]?.player === state.currentPlayer
      && state.points[point].count > 0;
  if (!isBar && !isOwn) {
    return { ...state, selectedPoint: null, legalMovesForSelected: [] };
  }
  const legal = getLegalMoves(state).filter(move => move.from === point);
  if (legal.length === 0) {
    return state;
  }
  return { ...state, selectedPoint: point, legalMovesForSelected: legal };
}

/* eslint-disable max-lines-per-function -- lesson step orchestration */
export function useLessonSession(lesson: LessonDefinition) {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<GameState>(() => buildState(lesson.steps[0]!));
  const [correctMoves, setCorrectMoves] = useState(0);
  const [stepComplete, setStepComplete] = useState(
    () => lesson.steps[0]?.kind === 'explain',
  );
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);
  const boardDimsRef = useRef<BoardDimensions | null>(null);
  const dragFromRef = useRef<number | null>(null);

  const step = lesson.steps[stepIndex]!;
  const totalSteps = lesson.steps.length;

  const emphasisPoints = useMemo(() => {
    if (!step.emphasisPoints?.length) {
      return undefined;
    }
    return new Set(step.emphasisPoints);
  }, [step]);

  const endDrag = useCallback(() => {
    dragFromRef.current = null;
    setDragFrom(null);
    setPreviewTarget(null);
  }, []);

  const resetStep = useCallback((nextStep: LessonStep) => {
    endDrag();
    setState(buildState(nextStep));
    setCorrectMoves(0);
    setStepComplete(nextStep.kind === 'explain');
    setFeedback(null);
  }, [endDrag]);

  const setBoardDimensions = useCallback((dims: BoardDimensions) => {
    boardDimsRef.current = dims;
  }, []);

  const goToStep = useCallback((index: number) => {
    const next = lesson.steps[index];
    if (!next) {
      return;
    }
    setStepIndex(index);
    resetStep(next);
  }, [lesson.steps, resetStep]);

  const advance = useCallback(() => {
    hapticLight();
    if (stepIndex >= totalSteps - 1) {
      setLessonFinished(true);
      return;
    }
    goToStep(stepIndex + 1);
  }, [goToStep, stepIndex, totalSteps]);

  const showHint = useCallback(() => {
    if (step.kind === 'explain') {
      return;
    }
    setFeedback({ tone: 'hint', messageKey: step.hintKey as TxKeyPath });
  }, [step]);

  const completeInteractiveStep = useCallback((praiseKey: string) => {
    hapticSelection();
    setStepComplete(true);
    setFeedback({ tone: 'praise', messageKey: praiseKey as TxKeyPath });
  }, []);

  const handleIdentifyTap = useCallback((point: number) => {
    if (step.kind !== 'identify' || stepComplete) {
      return;
    }
    const result = validateIdentify(step.targets, point);
    if (result.status === 'correct') {
      completeInteractiveStep(step.praiseKey);
      return;
    }
    hapticLight();
    setFeedback({ tone: 'soft', messageKey: 'learn.feedback.illegal' });
  }, [completeInteractiveStep, step, stepComplete]);

  const tryApplyDestination = useCallback((from: number, to: number) => {
    if (step.kind !== 'tryMove' || stepComplete) {
      return;
    }
    const result = validateTryMove({
      state,
      accepted: step.acceptedMoves,
      from,
      to,
    });
    if (result.status === 'illegal') {
      hapticLight();
      setFeedback({ tone: 'soft', messageKey: 'learn.feedback.illegal' });
      setState(prev => ({ ...prev, selectedPoint: null, legalMovesForSelected: [] }));
      return;
    }
    if (result.status === 'legalButWrong') {
      hapticLight();
      setFeedback({
        tone: 'soft',
        messageKey: (step.legalButWrongKey ?? 'learn.feedback.legal_but_wrong') as TxKeyPath,
      });
      setState(prev => ({ ...prev, selectedPoint: null, legalMovesForSelected: [] }));
      return;
    }

    const move = resolveAcceptedMove(state, from, to);
    if (!move) {
      setFeedback({ tone: 'soft', messageKey: 'learn.feedback.illegal' });
      return;
    }

    const nextState = applyMove(state, move);
    // Keep the learner as white; if the engine passed the turn, freeze the board for praise.
    const patched: GameState = nextState.winner
      ? nextState
      : {
          ...nextState,
          currentPlayer: 'white',
          phase: 'moving',
          dice: nextState.dice[0] === 0 && nextState.dice[1] === 0 ? state.dice : nextState.dice,
          remainingDice:
            nextState.phase === 'rolling' || nextState.phase === 'no-move'
              ? []
              : nextState.remainingDice,
          selectedPoint: null,
          legalMovesForSelected: [],
        };

    setState(patched);
    const needed = step.requiredMoveCount ?? 1;
    const nextCount = correctMoves + 1;
    setCorrectMoves(nextCount);
    if (nextCount >= needed) {
      completeInteractiveStep(step.praiseKey);
    }
    else {
      hapticLight();
      setFeedback(null);
    }
  }, [completeInteractiveStep, correctMoves, state, step, stepComplete]);

  const onPointPress = useCallback((index: number) => {
    if (stepComplete && step.kind !== 'explain') {
      return;
    }
    if (step.kind === 'identify') {
      handleIdentifyTap(index);
      return;
    }
    if (step.kind !== 'tryMove') {
      return;
    }

    if (state.selectedPoint !== null) {
      const targets = getReachableDestinations(state, state.selectedPoint);
      if (targets.has(index)) {
        tryApplyDestination(state.selectedPoint, index);
        return;
      }
    }

    setState(prev => selectSource(prev, index));
  }, [handleIdentifyTap, state, step, stepComplete, tryApplyDestination]);

  const onBarPress = useCallback(() => {
    if (step.kind === 'identify') {
      handleIdentifyTap(0);
      return;
    }
    if (step.kind !== 'tryMove' || stepComplete) {
      return;
    }
    setState(prev => selectSource(prev, 0));
  }, [handleIdentifyTap, step, stepComplete]);

  const onBearOffPress = useCallback(() => {
    if (step.kind !== 'tryMove' || stepComplete || state.selectedPoint === null) {
      return;
    }
    const targets = getReachableDestinations(state, state.selectedPoint);
    if (targets.has(BEAR_OFF)) {
      tryApplyDestination(state.selectedPoint, BEAR_OFF);
    }
  }, [state, step, stepComplete, tryApplyDestination]);

  const onPointPressIn = useCallback((_index: number) => {}, []);
  const onPointPressOut = useCallback(() => {}, []);

  const canDrag
    = step.kind === 'tryMove' && !stepComplete && !lessonFinished;

  const handleDragStart = useCallback((from: number, _boardX: number, _boardY: number) => {
    if (!canDrag) {
      return;
    }
    if (validateDragStart(state, from) !== 'ok') {
      return;
    }
    dragFromRef.current = from;
    setDragFrom(from);
    setPreviewTarget(null);
    setState(prev => selectSource(prev, from));
    hapticLight();
  }, [canDrag, state]);

  const handleDragMove = useCallback((boardX: number, boardY: number) => {
    const from = dragFromRef.current;
    const dims = boardDimsRef.current;
    if (from === null || !dims || !canDrag) {
      return;
    }
    setPreviewTarget(previewFromDrag({ state, from, boardX, boardY, dims }));
  }, [canDrag, state]);

  const handleDragEnd = useCallback((boardX: number, boardY: number) => {
    const from = dragFromRef.current;
    const dims = boardDimsRef.current;
    if (from === null || !dims || !canDrag) {
      endDrag();
      return;
    }
    const target = resolveDropTarget(boardX, boardY, dims);
    endDrag();
    if (target === null || target === from) {
      setState(prev => ({ ...prev, selectedPoint: null, legalMovesForSelected: [] }));
      return;
    }
    tryApplyDestination(from, target);
  }, [canDrag, endDrag, tryApplyDestination]);

  const handleDragCancel = useCallback(() => {
    endDrag();
    setState(prev => ({ ...prev, selectedPoint: null, legalMovesForSelected: [] }));
  }, [endDrag]);

  return {
    step,
    stepIndex,
    totalSteps,
    state,
    stepComplete,
    lessonFinished,
    feedback,
    emphasisPoints,
    emphasisBar: Boolean(step.emphasisBar),
    aids: step.aids,
    advance,
    showHint,
    onPointPress,
    onPointPressIn,
    onPointPressOut,
    onBarPress,
    onBearOffPress,
    previewTarget,
    dragFrom,
    canDrag,
    setBoardDimensions,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}
