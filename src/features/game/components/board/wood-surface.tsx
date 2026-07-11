import * as React from 'react';
import { View } from 'react-native';

import { BOARD_THEME } from './board-theme';

type Props = {
  width: number;
  height: number;
};

/** Uniform felt — no vertical gradient (keeps checker contrast consistent). */
export function WoodSurface({ width, height }: Props) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: BOARD_THEME.wood.base,
      }}
    />
  );
}
