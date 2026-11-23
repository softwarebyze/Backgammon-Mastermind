import { router, useNavigation, useRoute } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useGame } from '@/features/game/use-game';
import { savePersistedSession } from '@/lib/game/persistence';
import { hapticLight } from '@/lib/haptics';

export function useLeaveGame() {
  const posthog = usePostHog();
  const navigation = useNavigation();
  const route = useRoute();
  const { state, moveLog, replayBaseline, cubeEvents, clearAITimeout } = useGame();
  const allowLeaveRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const finishGame = useCallback(() => {
    clearAITimeout();
    if (state) {
      savePersistedSession({ state, moveLog, replayBaseline, cubeEvents });
    }
    posthog.capture('game_exited', {
      mode: state?.mode ?? null,
      phase: state?.phase ?? null,
      move_count: moveLog.length,
    });
  }, [posthog, clearAITimeout, state, moveLog, replayBaseline, cubeEvents]);

  // Browser POP removes this screen without native removal prevention. Keep
  // the latest session for that unmount without installing beforeunload.
  // Language remounts (screenLayout key) unmount the body while the route
  // stays; missing-state redirects leave with no session — skip both.
  const finishOnRemove = useRef(finishGame);
  finishOnRemove.current = finishGame;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const routeKey = route.key;
    return () => {
      mounted.current = false;
      // Strict Mode replays effects on mount; defer until that replay settles.
      void Promise.resolve().then(() => {
        if (mounted.current || Platform.OS !== 'web' || allowLeaveRef.current)
          return;
        const stillPresent = navigation.getState()?.routes.some(r => r.key === routeKey) ?? false;
        if (!stillPresent && stateRef.current)
          finishOnRemove.current();
      });
    };
  }, [navigation, route.key]);

  const leaveGame = useCallback(() => {
    finishGame();
    allowLeaveRef.current = true;
    hapticLight();
    router.replace('/');
  }, [finishGame]);

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
