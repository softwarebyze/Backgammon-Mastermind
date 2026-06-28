import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { clampPathAnchor } from '@/features/game/components/board/move-path-bounds';
import { countAtPoint, destStackCount } from '@/features/game/move-animation';

export function movePathAnchors(
  entry: MoveLogEntry,
  beforeState: GameState,
  dims: BoardDimensions,
) {
  const player = entry.player;
  const fromCount = countAtPoint(beforeState, entry.from, player);
  const toCount = destStackCount(beforeState, entry.to, player);
  const from = clampPathAnchor(getCheckerAnchor({
    pointIndex: entry.from,
    dims,
    stackCount: fromCount,
    player,
  }), dims);
  const to = clampPathAnchor(getCheckerAnchor({
    pointIndex: entry.to,
    dims,
    stackCount: toCount,
    player,
  }), dims);
  return { from, to };
}
