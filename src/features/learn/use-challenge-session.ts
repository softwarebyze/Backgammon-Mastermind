import type { Dispatch, SetStateAction } from 'react';
import type { GameState, Move } from '@/lib/game/types';
import type { TxKeyPath } from '@/lib/i18n';
import type { Challenge, ChallengeStep } from '@/lib/learn/challenges';

import { usePostHog } from 'posthog-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';
import { createPositionState } from '@/lib/game/create-position';
import { applyMove } from '@/lib/game/moves';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import {
  resolveAcceptedMove,
  validateIdentify,
  validateTryMove,
} from '@/lib/learn/validate-step';

export type ChallengeFeedback = {
  tone: 'hint' | 'praise' | 'soft';
  messageKey: TxKeyPath;
  messageOptions?: Record<string, string | number>;
};

export type ChallengePhase = 'show' | 'do' | 'celebrate';

function buildState(step: ChallengeStep, challenge: Challenge): GameState {
  return createPositionState(challenge.position);
}

function patchAfterChallengeMove(state: GameState, nextState: GameState): GameState {
  if (nextState.winner) {
    return nextState;
  }
  return {
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
}

/* eslint-disable max-lines-per-function -- challenge session logic is inherently complex */
export function useChallengeSession(challenge: Challenge) {
  const posthog = usePostHog();
  const [phase, setPhase] = useState<ChallengePhase>('show');
  const [state, setState] = useState<GameState>(() =>
    buildState(challenge.step, challenge),
  );
  const [correctMoves, setCorrectMoves] = useState(0);
  const [stepComplete, setStepComplete] = useState(false);
  const [feedback, setFeedback] = useState<ChallengeFeedback | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);

  const step = challenge.step;
  const playEnabled = step.kind === 'tryMove' && phase === 'do' && !stepComplete;

  const selectPoint = useGameSelectPoint(
    setState as Dispatch<SetStateAction<GameState | null>>,
    false,
  );

  const emphasisPoints = useMemo(() => {
    if (!challenge.emphasisPoints?.length) {
      return undefined;
    }
    return new Set(challenge.emphasisPoints);
  }, [challenge.emphasisPoints]);

  /** Teaching guide: a single accepted move to demo while the player has not tried yet. */
  const moveGuide = useMemo(() => {
    if (step.kind !== 'tryMove' || phase !== 'do' || stepComplete || attempts !== 0) {
      return null;
    }
    const single = step.acceptedMoves.length === 1 ? step.acceptedMoves[0] : null;
    if (!single) {
      return null;
    }
    return { from: single.from, to: single.to };
  }, [attempts, phase, step, stepComplete]);

  const startDoPhase = useCallback(() => {
    setPhase('do');
    setFeedback(null);
  }, []);

  const showHint = useCallback(() => {
    if (step.kind === 'identify' || step.kind === 'tryMove') {
      setHintUsed(true);
      posthog.capture('learn_hint_shown', {
        challenge_id: challenge.id,
        challenge_step_kind: step.kind,
      });
      setFeedback({ tone: 'hint', messageKey: step.hintKey as TxKeyPath });
    }
  }, [challenge.id, posthog, step]);

  const completeStep = useCallback((praiseKey: string) => {
    hapticSelection();
    setStepComplete(true);
    setFeedback({ tone: 'praise', messageKey: praiseKey as TxKeyPath });
    posthog.capture('challenge_completed', {
      challenge_id: challenge.id,
      challenge_step_kind: step.kind,
    });
  }, [challenge.id, posthog, step.kind]);

  const handleIdentifyTap = useCallback((point: number) => {
    if (step.kind !== 'identify' || stepComplete) {
      return;
    }
    setAttempts(a => a + 1);
    const result = validateIdentify(step.targets, point);
    if (result.status === 'correct') {
      completeStep(step.praiseKey);
      return;
    }
    hapticLight();
    setFeedback({ tone: 'soft', messageKey: 'learn.feedback.illegal' });
  }, [completeStep, step, stepComplete]);

  const tryApplyDestination = useCallback((from: number, to: number) => {
    if (step.kind !== 'tryMove' || stepComplete) {
      return;
    }
    setAttempts(a => a + 1);
    const result = validateTryMove({
      state,
      accepted: step.acceptedMoves,
      from,
      to,
    });
    if (result.status === 'illegal') {
      hapticLight();
      posthog.capture('learn_move_feedback', {
        challenge_id: challenge.id,
        status: 'illegal',
      });
      setFeedback({ tone: 'soft', messageKey: 'learn.feedback.illegal' });
      selectPoint(null);
      return;
    }
    if (result.status === 'legalButWrong') {
      hapticLight();
      posthog.capture('learn_move_feedback', {
        challenge_id: challenge.id,
        status: 'legal_but_wrong',
      });
      setFeedback({
        tone: 'soft',
        messageKey: (step.legalButWrongKey ?? 'learn.feedback.legal_but_wrong') as TxKeyPath,
      });
      selectPoint(null);
      return;
    }

    const move = resolveAcceptedMove(state, from, to);
    if (!move) {
      setFeedback({ tone: 'soft', messageKey: 'learn.feedback.illegal' });
      return;
    }

    const nextState = applyMove(state, move);
    setState(patchAfterChallengeMove(state, nextState));
    const needed = step.requiredMoveCount ?? 1;
    const nextCount = correctMoves + 1;
    setCorrectMoves(nextCount);
    if (nextCount >= needed) {
      completeStep(step.praiseKey);
    }
    else {
      hapticLight();
      setFeedback({
        tone: 'praise',
        messageKey: 'learn.feedback.move_progress',
        messageOptions: { done: nextCount, needed },
      });
    }
  }, [challenge.id, completeStep, correctMoves, posthog, selectPoint, state, step, stepComplete]);

  const doMove = useCallback((move: Move) => {
    tryApplyDestination(move.from, move.to);
  }, [tryApplyDestination]);

  const doMoveSequence = useCallback((moves: Move[]) => {
    const first = moves[0];
    const last = moves[moves.length - 1];
    if (!first || !last) {
      return;
    }
    tryApplyDestination(first.from, last.to);
  }, [tryApplyDestination]);

  const actions = useMemo(
    () => ({ selectPoint, doMove, doMoveSequence }),
    [selectPoint, doMove, doMoveSequence],
  );

  const {
    previewTarget,
    dragFrom,
    setBoardDimensions,
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
  } = useBoardPlayInput({
    state,
    isAnimating: false,
    isHumanTurn: playEnabled,
    enableRollNudge: false,
    actions,
  });

  const onPointPress = useCallback((index: number) => {
    if (step.kind === 'identify' && phase === 'do' && !stepComplete) {
      handleIdentifyTap(index);
      return;
    }
    handlePointPress(index);
  }, [handleIdentifyTap, handlePointPress, phase, step.kind, stepComplete]);

  const onBarPress = useCallback(() => {
    if (step.kind === 'identify' && phase === 'do' && !stepComplete) {
      handleIdentifyTap(0);
      return;
    }
    handleBarPress();
  }, [handleBarPress, handleIdentifyTap, phase, step.kind, stepComplete]);

  const attemptsRef = useRef(attempts);
  attemptsRef.current = attempts;

  return {
    phase,
    step,
    state,
    stepComplete,
    feedback,
    emphasisPoints,
    emphasisBar: Boolean(challenge.emphasisBar),
    aids: challenge.aids,
    moveGuide,
    hintsUsed: hintUsed,
    attempts: attemptsRef,
    startDoPhase,
    showHint,
    previewTarget,
    dragFrom,
    canDrag: playEnabled,
    setBoardDimensions,
    onPointPress,
    onPointPressIn: handlePointPressIn,
    onPointPressOut: handlePointPressOut,
    onBarPress,
    onBearOffPress: handleBearOffPress,
    onBoardPress: handleBoardPress,
    handleDragAttempt,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}
