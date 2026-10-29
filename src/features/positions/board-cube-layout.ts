import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';

/**
 * Where the one doubling cube sits on the setup board. It lives in the bar,
 * like on a real table: centred on the hinge, or slid into the owner's half
 * (Black plays from the top, White from the bottom).
 */
export function boardCubeLayout(d: BoardDimensions, owner: Player | null, pointNumbers = true) {
  const size = Math.round(Math.max(26, Math.min(d.checkerSize + 2, d.barWidth * 1.2)));
  const surfaceTop = d.boardFrameWidth + (pointNumbers ? POINT_NUMBER_RAIL : 0);
  const centreX = d.boardFrameWidth + 6 * d.colWidth + d.barWidth / 2;
  const hinge = surfaceTop + d.pointHeight + d.middleHeight / 2;
  const centreY = owner === 'black'
    ? surfaceTop + d.pointHeight / 2
    : owner === 'white'
      ? surfaceTop + d.pointHeight + d.middleHeight + d.pointHeight / 2
      : hinge;
  return { size, left: Math.round(centreX - size / 2), top: Math.round(centreY - size / 2) };
}
