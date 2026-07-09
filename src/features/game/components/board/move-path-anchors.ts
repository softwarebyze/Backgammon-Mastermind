import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { countAtPoint, destStackCount } from '@/features/game/move-animation';
import { resolveMoveFromLogEntry } from '@/lib/game/move-replay';

export function movePathAnchorsFromFrame(frame: MoveAnimationFrame, dims: BoardDimensions) {
  const from = getCheckerAnchor({
    pointIndex: frame.from,
    dims,
    stackCount: frame.sourceStackCount,
    player: frame.player,
  });
  const to = getCheckerAnchor({
    pointIndex: frame.to,
    dims,
    stackCount: frame.destStackCount,
    player: frame.player,
  });
  return { from, to };
}

/**
 * Anchors for the move arrow, always pointing in the move's *played* direction.
 * A backward (undo) animation frame travels to→from, so its anchors are swapped
 * back rather than letting the arrow flip.
 */
export function resolvePathAnchors(ctx: {
  entry: MoveLogEntry;
  beforeState: GameState;
  dims: BoardDimensions;
  animation?: MoveAnimationFrame | null;
}) {
  const { entry, beforeState, dims, animation } = ctx;
  if (animation && animation.from === entry.from && animation.to === entry.to) {
    return movePathAnchorsFromFrame(animation, dims);
  }
  if (animation && animation.from === entry.to && animation.to === entry.from) {
    const { from, to } = movePathAnchorsFromFrame(animation, dims);
    return { from: to, to: from };
  }
  return movePathAnchors(entry, beforeState, dims);
}

export function movePathAnchors(
  entry: MoveLogEntry,
  beforeState: GameState,
  dims: BoardDimensions,
) {
  const player = entry.player;
  const move = resolveMoveFromLogEntry(beforeState, entry) ?? { from: entry.from, to: entry.to };
  const fromCount = countAtPoint(beforeState, move.from, player);
  const toCount = destStackCount(beforeState, move.to, player);
  const from = getCheckerAnchor({
    pointIndex: move.from,
    dims,
    stackCount: fromCount,
    player,
  });
  const to = getCheckerAnchor({
    pointIndex: move.to,
    dims,
    stackCount: toCount,
    player,
  });
  return { from, to };
}
