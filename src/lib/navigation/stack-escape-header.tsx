import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import { AlwaysOnEscapeHeader } from '@/components/navigation/always-on-escape-header';
import { StackEscapeButton } from '@/components/navigation/stack-escape-button';

type EscapeHeaderOptions = Pick<
  NativeStackNavigationOptions,
  'header' | 'headerLeft' | 'headerBackVisible'
>;

/**
 * Leading chevron that native-stack will not drop when the stack is empty
 * (refresh on /settings, /learn, …). Web uses a JS header so the back slot
 * is not gated on `canGoBack`. Native mobile uses a text escape control (no
 * chevron glyph) that still calls goBackOrHome when the stack is empty.
 */
export function stackEscapeHeaderOptionsFor(os: typeof Platform.OS): EscapeHeaderOptions {
  if (os === 'web') {
    return {
      headerBackVisible: false,
      header: props => <AlwaysOnEscapeHeader {...props} />,
    };
  }
  return {
    headerBackVisible: false,
    headerLeft: () => <StackEscapeButton />,
  };
}

export function stackEscapeHeaderOptions(): EscapeHeaderOptions {
  return stackEscapeHeaderOptionsFor(Platform.OS);
}
