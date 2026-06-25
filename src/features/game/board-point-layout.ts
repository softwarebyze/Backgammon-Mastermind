import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

export type PointAnchor = { x: number; y: number };

const MAX_VISIBLE = 5;

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

/** Pixel center for the top checker in a stack (board-local coordinates). */
export function getCheckerAnchor({
  pointIndex,
  dims,
  stackCount = 1,
  player,
}: CheckerAnchorOptions): PointAnchor {
  const { colWidth, pointHeight, middleHeight, barWidth, bearOffWidth, checkerSize, boardHeight } = dims;
  const step = stackStep(dims);
  const topOffset = Math.min(stackCount, MAX_VISIBLE) - 1;

  if (pointIndex === BAR_POINT) {
    const x = 6 * colWidth + barWidth / 2;
    const y = player === 'black'
      ? checkerSize / 2 + 6
      : boardHeight - checkerSize / 2 - 6;
    return { x, y: player === 'black' ? y : y - topOffset * 2 };
  }

  if (pointIndex === BEAR_OFF) {
    return {
      x: 12 * colWidth + barWidth + bearOffWidth / 2,
      y: boardHeight / 2,
    };
  }

  const mapped = columnForPoint(pointIndex);
  if (!mapped) {
    return { x: boardWidthCenter(dims), y: boardHeight / 2 };
  }

  const x = mapped.col * colWidth + colWidth / 2 + (mapped.col >= 6 ? barWidth : 0);
  const y = mapped.isTop
    ? checkerSize / 2 + topOffset * step
    : pointHeight + middleHeight + pointHeight - checkerSize / 2 - topOffset * step;

  return { x, y };
}

function boardWidthCenter(dims: BoardDimensions): number {
  return dims.boardWidth / 2;
}
