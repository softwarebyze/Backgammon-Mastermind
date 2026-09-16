import { usePathname } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

function subscribe(onChange: () => void) {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}

function getSnapshot() {
  return AppState.currentState === 'active';
}

/** Home, lessons, settings, and backgrounded apps must never advance a game. */
export function useGameActive(): boolean {
  const pathname = usePathname();
  const foreground = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return foreground && (pathname === '/game' || pathname === '/game/');
}
