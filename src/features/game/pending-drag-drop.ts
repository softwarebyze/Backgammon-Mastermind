import type { PointAnchor } from '@/features/game/board-point-layout';
import type { GameState } from '@/lib/game';
import { resolveDragMove } from '@/features/game/drag-move';

/** Drop captured while a prior move animation is still in flight. */
export type PendingDragDrop = {
  from: number;
  to: number;
  fromAnchor: PointAnchor;
};

/** Re-resolve against post-animation state so dice usage stays correct. */
export function resolvePendingDragDrop(state: GameState, pending: PendingDragDrop) {
  return resolveDragMove(state, pending.from, pending.to);
}
