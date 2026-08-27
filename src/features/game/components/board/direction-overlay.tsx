import * as React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

type Props = {
  width: number;
  height: number;
  player?: 'white' | 'black';
};

/** Subtle horseshoe path — teaching overlay, not garish */
export function DirectionOverlay({ width, height, player = 'white' }: Props) {
  const d = buildHorseshoePath(width, height, player);
  const stroke = player === 'white'
    ? 'rgba(245, 240, 232, 0.88)'
    : 'rgba(150, 170, 220, 0.88)';
  const { polygonPoints } = horseshoeArrowhead(width, height, player);

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polygon points={polygonPoints} fill={stroke} />
    </Svg>
  );
};
