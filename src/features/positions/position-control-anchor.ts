import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { PositionLocation } from '@/lib/positions/position';

export const POINT_CONTROLS_WIDTH = 152;

/** Align controls to the actual board column, clamping edge points on screen. */
export function positionControlAnchor(location: PositionLocation, d: BoardDimensions) {
  const top = typeof location === 'number' ? location >= 13 : location === 'black-bar';
  let centre = d.boardFrameWidth + 6 * d.colWidth + d.barWidth / 2;
  if (typeof location === 'number') {
    const right = top ? location >= 19 : location <= 6;
    const index = top ? right ? location - 19 : location - 13 : right ? 6 - location : 12 - location;
    centre = d.boardFrameWidth + (right ? 6 * d.colWidth + d.barWidth : 0) + (index + 0.5) * d.colWidth;
  }
  return { top, left: Math.max(0, Math.min(d.boardOuterWidth - POINT_CONTROLS_WIDTH, centre - POINT_CONTROLS_WIDTH / 2)) };
}
