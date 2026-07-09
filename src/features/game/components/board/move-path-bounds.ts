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
