import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

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

  const handleBackPress = useCallback(() => {
    leaveGame();
    return true;
  }, [leaveGame]);

  return {
    allowLeaveRef,
    leaveGame,
    handleBackPress,
    supportsHardwareBack: Platform.OS === 'android',
  };
}
