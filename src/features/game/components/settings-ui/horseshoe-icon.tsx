import * as React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { buildHorseshoePath } from '@/lib/game/horseshoe-path';

type Props = {
  size?: number;
  active?: boolean;
};

const VIEW = 32;

/** Compact bear-off horseshoe — arrowhead drawn inline (no SVG markers; stable on web). */
export function HorseshoeIcon({ size = 28, active = false }: Props) {
  const stroke = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  const d = buildHorseshoePath(VIEW, VIEW, 'white');
  // Path ends at bottom-right for white; arrow points east along the bottom edge.
  const pad = Math.max(4, VIEW * 0.04);
  const botY = VIEW * 0.78;
  const rightX = VIEW - pad - VIEW * 0.14;
  const tipX = rightX;
  const tipY = botY;
  const arrow = `${tipX},${tipY} ${tipX - 5},${tipY - 2.8} ${tipX - 5},${tipY + 2.8}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polygon points={arrow} fill={stroke} />
    </Svg>
  );
}
