import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useGame } from '@/features/game/use-game';
import { confirmAction } from '@/lib/confirm';
import { BEAR_OFF, findMoveSequence, getLegalMoves } from '@/lib/game';

/** Haptics throw on Android emulators and some devices — never block gameplay. */
function triggerHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

/* eslint-disable max-lines-per-function -- cohesive input orchestration */
export function useGameInput() {
  const { state, doRollDice, doPassTurn, selectPoint, doMove, doMoveSequence, resetGame, isAnimating } = useGame();
  // Keyed preview — auto-invalidates when turn/dice/animation changes (no effect).
  const turnKey = `${state?.phase}|${state?.currentPlayer}|${state?.dice[0]}|${state?.dice[1]}|${isAnimating}`;
  const [preview, setPreview] = useState<{ key: string; target: number | null }>({
    key: turnKey,
    target: null,
  });
  const previewTarget = preview.key === turnKey ? preview.target : null;
  const setPreviewTarget = useCallback((target: number | null) => {
    setPreview({ key: turnKey, target });
  }, [turnKey]);

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      if (!state || state.phase !== 'moving' || isAnimating) {
        return;
      }
      if (state.mode === 'vs-computer' && state.currentPlayer === 'black') {
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
    [state, doMove, doMoveSequence, selectPoint, isAnimating, setPreviewTarget],
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
    if (!state || state.phase !== 'moving' || isAnimating) {
      return;
    }
    if (state.mode === 'vs-computer' && state.currentPlayer === 'black') {
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
  }, [state, selectPoint, isAnimating]);

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
    handlePointPress,
    handlePointPressIn,
    handlePointPressOut,
    handleBearOffPress,
    handleBarPress,
    handleBoardPress,
    handleRoll,
    handlePassTurn,
    handleReset,
    handleBack,
  };
}
