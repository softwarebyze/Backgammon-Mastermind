import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import {
  bearOffCheckerCenterX,
  bearOffCheckerCenterY,
} from '@/features/game/bear-off-layout';
import { checkerRenderSize } from '@/features/game/move-animation';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

export type PointAnchor = { x: number; y: number };

const MAX_VISIBLE = 5;
const BAR_PADDING = 6;
const BAR_GAP = 2;

function stackStep(dims: BoardDimensions): number {
  return Math.min(dims.checkerSize - 2, (dims.pointHeight - dims.checkerSize) / (MAX_VISIBLE - 1));
}

function columnForPoint(pointIndex: number): { col: number; isTop: boolean } | null {
  if (pointIndex >= 13 && pointIndex <= 18) {
    return { col: pointIndex - 13, isTop: true };
  }
  if (pointIndex >= 19 && pointIndex <= 24) {
    return { col: 6 + (pointIndex - 19), isTop: true };
  }
  if (pointIndex >= 7 && pointIndex <= 12) {
    return { col: 12 - pointIndex, isTop: false };
  }
  if (pointIndex >= 1 && pointIndex <= 6) {
    return { col: 6 + (6 - pointIndex), isTop: false };
  }
  return null;
}

export type CheckerAnchorOptions = {
  pointIndex: number;
  dims: BoardDimensions;
  stackCount?: number;
  player?: Player;
};

function barCheckerCenterY(
  dims: BoardDimensions,
  player: Player,
  stackIndex: number,
): number {
  const tokenSize = checkerRenderSize(dims.checkerSize, BAR_POINT);

  if (player === 'black') {
    return BAR_PADDING + tokenSize / 2 + stackIndex * (tokenSize + BAR_GAP);
  }

  const stackBottom = dims.boardHeight - BAR_PADDING;
  return stackBottom - tokenSize / 2 - stackIndex * (tokenSize + BAR_GAP);
}

/** Pixel center for a move-hint dot — offset outside the stack toward the board edge. */
export function getMoveHintDotAnchor({
  pointIndex,
  dims,
  stackCount = 1,
  player,
}: CheckerAnchorOptions): PointAnchor {
  const center = getCheckerAnchor({ pointIndex, dims, stackCount, player });
  const mapped = columnForPoint(pointIndex);
  if (!mapped) {
    return center;
  }
  const bump = dims.checkerSize * 0.55 + 8;
  return {
    x: center.x,
    y: mapped.isTop ? center.y - bump : center.y + bump,
  };
}

/** Pixel center for the top checker in a stack (board-local coordinates). */
export function getCheckerAnchor({
  pointIndex,
  dims,
  stackCount = 1,
  player,
}: CheckerAnchorOptions): PointAnchor {
  const { colWidth, pointHeight, middleHeight, barWidth, checkerSize, boardHeight } = dims;
  const step = stackStep(dims);
  const topOffset = Math.min(stackCount, MAX_VISIBLE) - 1;

  if (pointIndex === BAR_POINT) {
    const x = 6 * colWidth + barWidth / 2;
    const y = barCheckerCenterY(dims, player ?? 'white', topOffset);
    return { x, y };
  }

  if (pointIndex === BEAR_OFF) {
    return {
      x: bearOffCheckerCenterX(dims),
      y: bearOffCheckerCenterY(dims, player ?? 'white', stackCount),
    };
  }

  const mapped = columnForPoint(pointIndex);
  if (!mapped) {
    return { x: dims.boardWidth / 2, y: boardHeight / 2 };
  }

  const x = mapped.col * colWidth + colWidth / 2 + (mapped.col >= 6 ? barWidth : 0);
  const y = mapped.isTop
    ? checkerSize / 2 + topOffset * step
    : pointHeight + middleHeight + pointHeight - checkerSize / 2 - topOffset * step;

  return { x, y };
}
