import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import { movePathAnchors } from '@/features/game/components/board/move-path-anchors';
import { insetPathSegment } from '@/features/game/components/board/move-path-bounds';
import { GAME_PALETTE } from '@/features/game/game-palette';

type Props = {
  entry: MoveLogEntry;
  /** Board state immediately before this move (for checker stack positions). */
  beforeState: GameState;
  dimensions: BoardDimensions;
};

const ARROW_COLOR = GAME_PALETTE.accent;

/** Dashed path from moving checker center to landing stack top (website-style). */
export function MovePathOverlay({ entry, beforeState, dimensions }: Props) {
  const raw = movePathAnchors(entry, beforeState, dimensions);
  const { from, to } = insetPathSegment(raw.from, raw.to);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tipX = to.x;
  const tipY = to.y;
  const baseX = tipX - ux * 14;
  const baseY = tipY - uy * 14;
  const px = -uy;
  const py = ux;
  const arrowPoints = [
    `${tipX},${tipY}`,
    `${baseX + px * 7},${baseY + py * 7}`,
    `${baseX - px * 7},${baseY - py * 7}`,
  ].join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={ARROW_COLOR}
          strokeWidth={3}
          strokeDasharray="10 8"
          strokeLinecap="round"
          opacity={0.9}
        />
        <Polygon points={arrowPoints} fill={ARROW_COLOR} opacity={0.95} />
      </Svg>
    </View>
  );
}
