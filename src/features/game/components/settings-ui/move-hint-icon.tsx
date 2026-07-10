import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';

type Props = {
  size?: number;
  active?: boolean;
};

/** Checker with highlight ring — move hints setting */
export function MoveHintIcon({ size = 28, active = false }: Props) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const ring = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#F2EAD3"
          stroke="#BBA070"
          strokeWidth={1.5}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r + 3}
          fill="none"
          stroke={ring}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
