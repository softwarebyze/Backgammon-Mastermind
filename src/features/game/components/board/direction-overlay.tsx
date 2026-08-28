import * as React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead, horseshoeHaloArrow } from '@/lib/ui/arrow-geometry';

type Props = {
  width: number;
  height: number;
};

const HALO = GAME_PALETTE.bg;
/** Cream White lane — already readable; light halo keeps it on gold points. */
const WHITE_STROKE = 'rgba(245, 240, 232, 0.86)';
/** Cooler-hue Black lane — was 55% pale blue and vanished on gold wood. */
const BLACK_STROKE = 'rgba(186, 208, 255, 0.9)';

type LaneProps = {
  width: number;
  height: number;
  player: 'white' | 'black';
  stroke: string;
  strokeWidth: number;
  dashed?: boolean;
};

function pathToArrowBase(d: string, lineEnd: { x: number; y: number }): string {
  return d.replace(/L [\d.]+ [\d.]+$/, `L ${lineEnd.x} ${lineEnd.y}`);
}

function HorseshoeLane({ width, height, player, stroke, strokeWidth, dashed }: LaneProps) {
  const d = buildHorseshoePath(width, height, player);
  const head = horseshoeArrowhead(width, height, player);
  const haloHead = horseshoeHaloArrow(width, height, player);
  const trimmed = pathToArrowBase(d, head.lineEnd);
  const dash = dashed ? '6 4' : undefined;
  const haloWidth = strokeWidth + 3.25;

  return (
    <>
      <Path
        d={trimmed}
        stroke={HALO}
        strokeWidth={haloWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
      <Path
        d={trimmed}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
      <Polygon points={haloHead.polygonPoints} fill={HALO} />
      <Polygon
        points={head.polygonPoints}
        fill={stroke}
        stroke={HALO}
        strokeWidth={player === 'black' ? 2.25 : 1.75}
        strokeLinejoin="round"
      />
    </>
  );
}

/** Cream (White) + dashed (Black) lanes — teaching overlay, not garish. */
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
        strokeWidth={2.75}
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
