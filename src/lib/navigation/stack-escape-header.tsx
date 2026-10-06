import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import { AlwaysOnEscapeHeader } from '@/components/navigation/always-on-escape-header';

type EscapeHeaderOptions = Pick<
  NativeStackNavigationOptions,
  'header' | 'headerLeft' | 'headerBackVisible'
>;

/**
 * Leading chevron that native-stack will not drop when the stack is empty
 * (refresh on /settings, /learn, …). Web uses a JS header so the back slot
 * is not gated on `canGoBack`. Native mobile omits a header chevron and relies
 * on platform back (Android hardware back, iOS edge swipe where enabled).
 */
export function stackEscapeHeaderOptionsFor(os: typeof Platform.OS): EscapeHeaderOptions {
  if (os === 'web') {
    return {
      headerBackVisible: false,
      header: props => <AlwaysOnEscapeHeader {...props} />,
    };
  }
  // iOS/Android: no custom back chevron — use the system back gesture / hardware back.
  return {
    headerBackVisible: false,
    headerLeft: () => null,
  };
}

export function stackEscapeHeaderOptions(): EscapeHeaderOptions {
  return stackEscapeHeaderOptionsFor(Platform.OS);
}
