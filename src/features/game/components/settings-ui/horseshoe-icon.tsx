import * as React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

type Props = {
  size?: number;
  active?: boolean;
};

const VIEW = 32;

/** Compact bear-off horseshoe — inline arrowhead (no SVG markers; stable on web). */
export function HorseshoeIcon({ size = 28, active = false }: Props) {
  const stroke = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  const d = buildHorseshoePath(VIEW, VIEW, 'white');
  const { polygonPoints } = horseshoeArrowhead(VIEW, VIEW, { player: 'white' });

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
      <Polygon points={polygonPoints} fill={stroke} />
    </Svg>
  );
}
