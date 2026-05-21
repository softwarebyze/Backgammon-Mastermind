import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useGame } from '@/features/game/game-context';
import { getLegalMoves } from '@/lib/game';

export function useGameInput() {
  const { state, doRollDice, selectPoint, doMove, resetGame } = useGame();

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      if (!state || state.phase !== 'moving')
        return;
      if (state.mode === 'vs-computer' && state.currentPlayer === 'black')
        return;

      if (state.selectedPoint !== null) {
        const move = state.legalMovesForSelected.find(m => m.to === pointIndex);
        if (move) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          doMove(move);
          return;
        }
      }

      Haptics.selectionAsync();
      selectPoint(pointIndex);
    },
    [state, doMove, selectPoint],
  );

  const handleBarPress = useCallback(() => {
    if (!state || state.phase !== 'moving')
      return;
    if (state.mode === 'vs-computer' && state.currentPlayer === 'black')
      return;
    if (state.bar[state.currentPlayer] === 0)
      return;

    if (state.selectedPoint === 0) {
      selectPoint(null);
      return;
    }

    const barMoves = getLegalMoves(state).filter(m => m.from === 0);
    if (barMoves.length === 0)
      return;

    Haptics.selectionAsync();
    selectPoint(0);
  }, [state, selectPoint]);

  const handleBoardPress = useCallback(() => {
    if (!state)
      return;
    selectPoint(null);
  }, [state, selectPoint]);

  const handleRoll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    doRollDice();
  }, [doRollDice]);

  const handleReset = useCallback(() => {
    Alert.alert('New Game', 'Start a new game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
    handlePointPress,
    handleBarPress,
    handleBoardPress,
    handleRoll,
    handleReset,
    handleBack,
  };
}
