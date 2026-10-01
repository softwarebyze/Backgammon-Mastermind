import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';

type Props = {
  size?: number;
  active?: boolean;
};

/** Graduation cap — tutor mode setting */
export function TutorIcon({ size = 28, active = false }: Props) {
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  const cx = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Mortarboard */}
        <Polygon
          points={`${cx},${size * 0.14} ${size * 0.92},${size * 0.36} ${cx},${size * 0.58} ${size * 0.08},${size * 0.36}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Head band */}
        <Polygon
          points={`${size * 0.28},${size * 0.47} ${size * 0.28},${size * 0.62} ${cx},${size * 0.74} ${size * 0.72},${size * 0.62} ${size * 0.72},${size * 0.47} ${cx},${size * 0.58}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Tassel */}
        <Line
          x1={size * 0.92}
          y1={size * 0.36}
          x2={size * 0.92}
          y2={size * 0.66}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx={size * 0.92} cy={size * 0.7} r={size * 0.05} fill={color} />
      </Svg>
    </View>
  );
}
