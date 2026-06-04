import * as React from 'react';
import Svg, { Defs, Marker, Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';

type Props = {
  size?: number;
  color?: string;
};

/** Compact bear-off horseshoe — same geometry as the board direction overlay */
export function HorseshoeIcon({ size = 28, color = '#D4A843' }: Props) {
  const d = buildHorseshoePath(32, 32, 'white');
  const markerId = React.useId().replace(/:/g, '');

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <Marker
          id={`horseshoe-arrow-${markerId}`}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <Polygon points="0 0, 6 3, 0 6" fill={color} />
        </Marker>
      </Defs>
      <Path
        d={d}
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#horseshoe-arrow-${markerId})`}
      />
    </Svg>
  );
}
