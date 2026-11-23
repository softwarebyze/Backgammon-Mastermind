import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import { cubeCenter, maxCubeEdge } from '@/features/game/bear-off-layout';
import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';

/** Top to bottom: Black plays from the top, White from the bottom. */
const CUBE_SLOTS = ['black', null, 'white'] as const satisfies readonly (Player | null)[];

type CubeSlot = (typeof CUBE_SLOTS)[number];

/**
 * Where the one doubling cube sits on the setup board, exactly as in a match
 * game: centred on the tray's hinge, or at its owner's end of the centre bar.
 * Owners sit `travel` above or below the centre and `shift` across (toward the bar).
 */
export function boardCubeLayout(d: BoardDimensions, pointNumbers = true) {
  // The cube always fits inside the tray and clear of the stacks, however small the board gets.
  const size = Math.round(Math.min(d.checkerSize + 2, maxCubeEdge(d)));
  const surfaceTop = d.boardFrameWidth + (pointNumbers ? POINT_NUMBER_RAIL : 0);
  const centre = cubeCenter(d, null);
  const owned = cubeCenter(d, 'black');
  const hinge = surfaceTop + d.pointHeight + d.middleHeight / 2;
  return {
    size,
    left: Math.round(d.boardFrameWidth + centre.x - size / 2),
    /** Top edge of the centred cube. */
    top: Math.round(hinge - size / 2),
    travel: Math.round(centre.y - owned.y),
    shift: Math.round(owned.x - centre.x),
  };
}

/** How far from the centred slot a slot sits: Black up, White down. */
export function cubeSlotOffset(slot: CubeSlot, travel: number): number {
  return slot === 'black' ? -travel : slot === 'white' ? travel : 0;
}

/** The slot a drag released `offset` from the centre snaps to. */
export function snapCubeSlot(offset: number, travel: number): CubeSlot {
  if (offset < -travel / 2)
    return 'black';
  if (offset > travel / 2)
    return 'white';
  return null;
}

/** One step up (toward Black) or down (toward White); undefined past the end. */
export function stepCubeSlot(slot: CubeSlot, direction: -1 | 1): CubeSlot | undefined {
  const next = CUBE_SLOTS.indexOf(slot) + direction;
  return next < 0 || next >= CUBE_SLOTS.length ? undefined : CUBE_SLOTS[next];
}
