import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useGame } from '@/features/game/use-game';
import { BEAR_OFF, getLegalMoves } from '@/lib/game';

/** Haptics throw on Android emulators and some devices — never block gameplay. */
function triggerHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

/* eslint-disable max-lines-per-function -- cohesive input orchestration */
export function useGameInput() {
  const { state, doRollDice, selectPoint, doMove, resetGame } = useGame();
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      if (!state || state.phase !== 'moving') {
        return;
      }
      if (state.mode === 'vs-computer' && state.currentPlayer === 'black') {
        return;
      }

      setPreviewTarget(null);

      if (state.selectedPoint !== null) {
        const move = state.legalMovesForSelected.find(m => m.to === pointIndex);
        if (move) {
          triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
          doMove(move);
          return;
        }
      }

      triggerHaptic(() => Haptics.selectionAsync());
      selectPoint(pointIndex);
    },
    [state, doMove, selectPoint],
  );

  const handlePointPressIn = useCallback(
    (pointIndex: number) => {
      if (!state || state.phase !== 'moving' || state.selectedPoint === null) {
        return;
      }
      const isLegal = state.legalMovesForSelected.some(m => m.to === pointIndex);
      if (isLegal) {
        setPreviewTarget(pointIndex);
      }
    },
    [state],
  );

  const handlePointPressOut = useCallback(() => {
    setPreviewTarget(null);
  }, []);

  const handleBearOffPress = useCallback(() => {
    if (!state || state.phase !== 'moving' || state.selectedPoint === null) {
      return;
    }
    const move = state.legalMovesForSelected.find(m => m.to === BEAR_OFF);
    if (move) {
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      doMove(move);
    }
  }, [state, doMove]);

  const handleBarPress = useCallback(() => {
    if (!state || state.phase !== 'moving') {
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
  }, [state, selectPoint]);

  const handleBoardPress = useCallback(() => {
    if (!state || state.phase !== 'moving') {
      return;
    }
    setPreviewTarget(null);
    selectPoint(null);
  }, [state, selectPoint]);

  const handleRoll = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    doRollDice();
  }, [doRollDice]);

  const handleReset = useCallback(() => {
    Alert.alert('New Game', 'Start a new game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        style: 'destructive',
        onPress: () => {
          triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
          resetGame();
        },
      },
    ]);
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
    handleReset,
    handleBack,
  };
}
