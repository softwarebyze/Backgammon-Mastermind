import * as React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

type Props = {
  width: number;
  height: number;
  player?: 'white' | 'black';
};

/** Teaching overlay showing the bear-off horseshoe path. */
export function DirectionOverlay({ width, height, player = 'white' }: Props) {
  const d = buildHorseshoePath(width, height, player);
  const stroke = 'rgba(212, 168, 67, 0.7)';
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
        strokeWidth={4.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polygon points={polygonPoints} fill={stroke} />
    </Svg>
  );
};
