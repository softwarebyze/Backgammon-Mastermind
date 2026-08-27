import * as React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

type Props = {
  width: number;
  height: number;
};

const WHITE_STROKE = 'rgba(245, 240, 232, 0.72)';
const BLACK_STROKE = 'rgba(150, 170, 220, 0.55)';

type LaneProps = {
  width: number;
  height: number;
  player: 'white' | 'black';
  stroke: string;
  strokeWidth: number;
  dashed?: boolean;
};

function HorseshoeLane({ width, height, player, stroke, strokeWidth, dashed }: LaneProps) {
  const d = buildHorseshoePath(width, height, player);
  const { polygonPoints } = horseshoeArrowhead(width, height, player);
  return (
    <>
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? '7 6' : undefined}
      />
      <Polygon points={polygonPoints} fill={stroke} />
    </>
  );
}

/** Cream (White) + cooler (Black) lanes — teaching overlay, not garish. */
export function DirectionOverlay({ width, height }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      <HorseshoeLane
        width={width}
        height={height}
        player="black"
        stroke={BLACK_STROKE}
        strokeWidth={2}
        dashed
      />
      <HorseshoeLane
        width={width}
        height={height}
        player="white"
        stroke={WHITE_STROKE}
        strokeWidth={2.5}
      />
    </Svg>
  );
}
