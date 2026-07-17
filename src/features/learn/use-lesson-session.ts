import type { GameState } from '@/lib/game/types';
import type { TxKeyPath } from '@/lib/i18n';
import type { LessonDefinition, LessonStep } from '@/lib/learn/curriculum';

import { useCallback, useMemo, useState } from 'react';
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

  const step = lesson.steps[stepIndex]!;
  const totalSteps = lesson.steps.length;

  const emphasisPoints = useMemo(() => {
    if (!step.emphasisPoints?.length) {
      return undefined;
    }
    return new Set(step.emphasisPoints);
  }, [step]);

  const resetStep = useCallback((nextStep: LessonStep) => {
    setState(buildState(nextStep));
    setCorrectMoves(0);
    setStepComplete(nextStep.kind === 'explain');
    setFeedback(null);
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
    previewTarget: null as number | null,
  };
}
