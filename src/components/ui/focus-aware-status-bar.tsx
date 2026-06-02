import type { ComponentProps } from 'react';
import { useIsFocused } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

type SystemBarsStyle = ComponentProps<typeof SystemBars>['style'];

type Props = {
  hidden?: boolean;
  /**
   * Status bar content (icons/clock) style. Defaults to `'light'` because every
   * screen renders on the app's fixed dark surface palette, so dark icons would
   * be invisible. Override per-screen if a light surface is ever introduced.
   */
  style?: SystemBarsStyle;
};

export function FocusAwareStatusBar({ hidden = false, style = 'light' }: Props) {
  const isFocused = useIsFocused();

  if (Platform.OS === 'web')
    return null;

  return isFocused ? <SystemBars style={style} hidden={hidden} /> : null;
}
