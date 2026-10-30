import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import { cubeCenterY, cubeCornerClearance } from '@/features/game/bear-off-layout';
import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';

/** Top to bottom: Black plays from the top, White from the bottom. */
const CUBE_SLOTS = ['black', null, 'white'] as const satisfies readonly (Player | null)[];

type CubeSlot = (typeof CUBE_SLOTS)[number];

/**
 * Where the one doubling cube sits on the setup board: in the bear-off tray,
 * exactly as in a match game. Centred on the hinge, or in its owner's outer
 * corner, clear of borne-off checkers. It only ever moves up and down that column.
 */
export function boardCubeLayout(d: BoardDimensions, pointNumbers = true) {
  const clearance = d.bearOffCubeClearance ?? cubeCornerClearance(d.pointHeight);
  // The cube always fits inside the tray, however small the board gets.
  const size = Math.round(Math.max(10, Math.min(d.checkerSize + 2, d.bearOffWidth - 4, clearance)));
  const surfaceTop = d.boardFrameWidth + (pointNumbers ? POINT_NUMBER_RAIL : 0);
  const trayCentreX = d.boardFrameWidth + 12 * d.colWidth + d.barWidth + d.bearOffWidth / 2;
  const hinge = surfaceTop + d.pointHeight + d.middleHeight / 2;
  const travel = Math.round(d.boardHeight / 2 - cubeCenterY(d, 'black'));
  return {
    size,
    left: Math.round(trayCentreX - size / 2),
    /** Top edge of the centred cube; owners sit `travel` above or below. */
    top: Math.round(hinge - size / 2),
    travel,
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

/** A tap doubles the cube; past the top value it wraps back to the centred 64. */
export function nextCubeExponent(exponent: number, maxCube: number): number {
  return exponent >= maxCube ? 0 : exponent + 1;
}
