import * as React from 'react';
import Svg, { G, Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

type Props = {
  width: number;
  height: number;
  player: 'white' | 'black';
  /** Mirror the lane to match the natively-mirrored RTL board. */
  rtl?: boolean;
};

const HALO = 'rgba(30, 12, 2, 0.36)';
const PLAYER_STROKE = {
  white: 'rgba(242, 234, 211, 0.52)',
  black: 'rgba(80, 80, 160, 0.58)',
} as const;

type LaneProps = {
  width: number;
  height: number;
  player: 'white' | 'black';
  stroke: string;
};

/** Trim the lane stroke to the base of its filled arrowhead. */
function pathToArrowBase(d: string, lineEnd: { x: number; y: number }): string {
  return d.replace(/L [\d.]+ [\d.]+$/, `L ${lineEnd.x} ${lineEnd.y}`);
}

/** Draw the halo, current-player stroke, and compact arrowhead as one lane. */
function HorseshoeLane({ width, height, player, stroke }: LaneProps) {
  const d = buildHorseshoePath(width, height, player);
  const head = horseshoeArrowhead(width, height, player);
  const trimmed = pathToArrowBase(d, head.lineEnd);
  const strokeWidth = 2.2;

  return (
    <>
      <Path
        d={trimmed}
        stroke={HALO}
        strokeWidth={strokeWidth + 1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={trimmed}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polygon
        points={head.polygonPoints}
        fill={stroke}
        stroke={HALO}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </>
  );
}

/** One quiet lane for the player whose turn is currently active. */
export function DirectionOverlay({ width, height, player, rtl = false }: Props) {
  const lane = (
    <HorseshoeLane
      width={width}
      height={height}
      player={player}
      stroke={PLAYER_STROKE[player]}
    />
  );

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      {/* The lane geometry is authored for LTR. In RTL the board itself is
          mirrored, so reflect the whole lane about its vertical centerline:
          the exit ends up on the bear-off side and the arrow points with play. */}
      {rtl ? <G transform={`translate(${width} 0) scale(-1 1)`}>{lane}</G> : lane}
    </Svg>
  );
}
