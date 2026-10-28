import type { Player } from '@/lib/game/types';

export const MAX_BAR_VISIBLE = 4;
const PADDING = 6;

/**
 * Board-local centers, back to front. Both stacks grow away from the hinge.
 * Shared by drawing, touch snapping, drag overlays, and move/path animations.
 * Vertical player sides stay fixed when the board's horizontal layout is RTL.
 */
export function barStackLayout({
  boardHeight,
  middleHeight,
  checkerSize,
  count,
  player,
}: {
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
  count: number;
  player: Player;
}) {
  const size = checkerSize * 0.88;
  const visible = Math.min(MAX_BAR_VISIBLE, Math.max(1, count));
  const halfHeight = (boardHeight - middleHeight) / 2;
  const step = Math.max(0, Math.min(size + 2, (halfHeight - 2 * PADDING - size) / (MAX_BAR_VISIBLE - 1)));
  const nearHinge = player === 'black'
    ? halfHeight - PADDING - size / 2
    : halfHeight + middleHeight + PADDING + size / 2;
  const direction = player === 'black' ? -1 : 1;
  const centers = Array.from({ length: visible }, (_, i) => nearHinge + direction * (visible - 1 - i) * step);
  return { size, centers };
}
