import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useState } from 'react';
import { Platform, Pressable } from 'react-native';

export type HoverState = { pressed: boolean; hovered: boolean };

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: HoverState) => StyleProp<ViewStyle>);
};

/**
 * Pressable whose style callback also gets `hovered` (web pointer hover).
 * Native never hovers, so this is a plain Pressable there.
 */
export function HoverPressable({ style, onHoverIn, onHoverOut, ...rest }: Props) {
  const [hovered, setHovered] = useState(false);
  const webHover: Pick<PressableProps, 'onHoverIn' | 'onHoverOut'> = Platform.OS === 'web'
    ? {
        onHoverIn: (e) => {
          setHovered(true);
          onHoverIn?.(e);
        },
        onHoverOut: (e) => {
          setHovered(false);
          onHoverOut?.(e);
        },
      }
    : {};
  return (
    <Pressable
      {...rest}
      {...webHover}
      style={typeof style === 'function'
        ? ({ pressed }) => style({ pressed, hovered })
        : style}
    />
  );
}
