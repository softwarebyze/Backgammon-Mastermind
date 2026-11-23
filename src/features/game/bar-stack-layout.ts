import type { Player } from '@/lib/game/types';

export const MAX_BAR_VISIBLE = 4;
const PADDING = 6;

/**
 * Board-local centers, back to front. Both stacks grow away from the hinge:
 * the first checker sits beside the hinge and each new one lands in the next
 * slot out, so checkers already on the bar never shift when another arrives.
 * Shared by drawing, touch snapping, drag overlays, and move/path animations.
 * Vertical player sides stay fixed when the board's horizontal layout is RTL.
 * On a board with a cube, the outer ends stay clear for an owned cube.
 */
export function barStackLayout({
  boardHeight,
  middleHeight,
  checkerSize,
  count,
  player,
  cubeFootprint,
}: {
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
  count: number;
  player: Player;
  cubeFootprint?: number;
}) {
  const size = checkerSize * 0.88;
  const visible = Math.min(MAX_BAR_VISIBLE, Math.max(1, count));
  const halfHeight = (boardHeight - middleHeight) / 2;
  // An owned cube sits 4px in from the board edge; keep a 2px gap past it.
  const outer = cubeFootprint ? Math.max(PADDING, cubeFootprint + 6) : PADDING;
  const step = Math.max(0, Math.min(size + 2, (halfHeight - PADDING - outer - size) / (MAX_BAR_VISIBLE - 1)));
  const nearHinge = player === 'black'
    ? halfHeight - PADDING - size / 2
    : halfHeight + middleHeight + PADDING + size / 2;
  const direction = player === 'black' ? -1 : 1;
  const centers = Array.from({ length: visible }, (_, i) => nearHinge + direction * i * step);
  return { size, centers };
}
