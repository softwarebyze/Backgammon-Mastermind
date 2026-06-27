import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import { useGame } from '@/features/game/use-game';
import { isResumableGame, saveActiveGame, saveMoveLog } from '@/lib/game/persistence';
import { hapticLight } from '@/lib/haptics';

export function useLeaveGame() {
  const { state, moveLog } = useGame();
  const allowLeaveRef = useRef(false);

  const leaveGame = useCallback(() => {
    if (state && isResumableGame(state)) {
      saveActiveGame(state);
      saveMoveLog(moveLog);
    }
    allowLeaveRef.current = true;
    hapticLight();
    router.replace('/');
  }, [state, moveLog]);

  const confirmLeaveGame = useCallback(() => {
    if (!state || !isResumableGame(state)) {
      leaveGame();
      return;
    }

    Alert.alert(
      'Leave game?',
      'Your game is saved — you can resume from home.',
      [
        { text: 'Keep playing', style: 'cancel' },
        {
          text: 'Save & exit',
          onPress: leaveGame,
        },
      ],
    );
  }, [leaveGame, state]);

  const handleBackPress = useCallback(() => {
    confirmLeaveGame();
    return true;
  }, [confirmLeaveGame]);

  return {
    allowLeaveRef,
    confirmLeaveGame,
    handleBackPress,
    supportsHardwareBack: Platform.OS === 'android',
  };
}
