import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

import { useGame } from '@/features/game/use-game';
import { isResumableGame, saveActiveGame, saveMoveLog } from '@/lib/game/persistence';
import { hapticLight } from '@/lib/haptics';

export function useLeaveGame() {
  const posthog = usePostHog();
  const { state, moveLog, clearAITimeout } = useGame();
  const allowLeaveRef = useRef(false);

  const leaveGame = useCallback(() => {
    clearAITimeout();
    if (state && isResumableGame(state)) {
      saveActiveGame(state);
      saveMoveLog(moveLog);
    }
    posthog.capture('game_exited', {
      mode: state?.mode ?? null,
      phase: state?.phase ?? null,
      move_count: moveLog.length,
    });
    allowLeaveRef.current = true;
    hapticLight();
    router.replace('/');
  }, [posthog, clearAITimeout, state, moveLog]);

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
