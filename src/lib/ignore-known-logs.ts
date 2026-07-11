import { LogBox } from 'react-native';

/**
 * Uniwind re-exports RN's SafeAreaView; Fast Refresh / export enumeration hits the
 * deprecation getter even when we never use that component.
 *
 * Upstream declined swapping to react-native-safe-area-context (breaking change for
 * their RN re-export model): https://github.com/uni-stack/uniwind/pull/347#issuecomment-3828160493
 * Tracking: https://github.com/uni-stack/uniwind/pull/347
 */
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated and will be removed in a future release',
]);
