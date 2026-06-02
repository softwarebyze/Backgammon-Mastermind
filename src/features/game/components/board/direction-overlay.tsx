import * as React from 'react';
import Svg, { Defs, Marker, Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';

type Props = {
  width: number;
  height: number;
  player?: 'white' | 'black';
};

/** Subtle horseshoe path — teaching overlay, not garish */
export function DirectionOverlay({ width, height, player = 'white' }: Props) {
  const d = buildHorseshoePath(width, height, player);

  const stroke = 'rgba(212, 168, 67, 0.42)';

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      <Defs>
        <Marker id="dir-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
          <Polygon points="0 0, 8 3, 0 6" fill={stroke} />
        </Marker>
      </Defs>
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#dir-arrow)"
      />
    </Svg>
  );
}
