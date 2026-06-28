import type { PointAnchor } from '@/features/game/board-point-layout';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

/** Keep dashed path stroke inside the playing surface (bar/bear-off anchors can sit on edges). */
const PATH_BOARD_INSET = 4;

export function clampPathAnchor(
  anchor: PointAnchor,
  dims: BoardDimensions,
  inset = PATH_BOARD_INSET,
): PointAnchor {
  return {
    x: Math.max(inset, Math.min(dims.boardWidth - inset, anchor.x)),
    y: Math.max(inset, Math.min(dims.boardHeight - inset, anchor.y)),
  };
}

/** Nudge line endpoints slightly inward so round caps do not bleed past the board clip. */
export function insetPathSegment(
  from: PointAnchor,
  to: PointAnchor,
  trim = 3,
): { from: PointAnchor; to: PointAnchor } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= trim * 2) {
    return { from, to };
  }
  const ux = dx / len;
  const uy = dy / len;
  return {
    from: { x: from.x + ux * trim, y: from.y + uy * trim },
    to: { x: to.x - ux * trim, y: to.y - uy * trim },
  };
}
