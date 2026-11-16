import type { TextProps, TextStyle } from 'react-native';
import * as React from 'react';
import { Text as NText, StyleSheet } from 'react-native';

import { emulateFontScale, FONT_SCALE_CAP, WEB_EMULATED_FONT_SCALE } from '@/lib/ui/font-scale';

/**
 * React Native `Text` with a default system-text-size cap. Use it instead of
 * importing `Text` from react-native so large Dynamic Type grows text without
 * overrunning fixed rows. Pass `maxFontSizeMultiplier={FONT_SCALE_CAP.control}`
 * (or `.fixed`) where the text must stay inside fixed geometry.
 */
export function Text({
  maxFontSizeMultiplier = FONT_SCALE_CAP.body,
  allowFontScaling,
  style,
  ...props
}: TextProps & { ref?: React.Ref<NText> }) {
  const cap = allowFontScaling === false ? 1 : maxFontSizeMultiplier;
  const emulated = React.useMemo(
    () => WEB_EMULATED_FONT_SCALE > 1
      ? emulateFontScale(StyleSheet.flatten(style) as TextStyle, cap)
      : style,
    [style, cap],
  );
  return (
    <NText
      {...props}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={emulated}
    />
  );
}
