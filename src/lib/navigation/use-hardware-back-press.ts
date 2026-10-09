import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android hardware back handler scoped to screen focus.
 *
 * Stack screens stay mounted underneath whatever is pushed on top, so a plain
 * `BackHandler` subscription in an effect keeps intercepting back (it is the
 * most recently registered handler) while a settings screen or sheet is open.
 * Subscribing on focus lets the topmost screen handle back instead.
 */
export function useHardwareBackPress(handler: () => boolean) {
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [handler]));
}
