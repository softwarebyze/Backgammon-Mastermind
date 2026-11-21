import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';

/** Matches BearOffArea token face size — keep in sync with animation end scale. */
const BEAR_OFF_TOKEN_SCALE = 0.78;
export const BEAR_OFF_PADDING = 4;
/** Every checker in a 15-checker set is drawn; nothing is hidden behind "+N". */
export const BEAR_OFF_MAX_CHECKERS = 15;

export function bearOffTokenSize(checkerSize: number): number {
  return Math.round(checkerSize * BEAR_OFF_TOKEN_SCALE);
}

export function bearOffHalfHeight(boardHeight: number, middleHeight: number): number {
  return (boardHeight - middleHeight) / 2;
}

/** Slabs are grouped in fives, XG-style, with a gap between groups. */
const BEAR_OFF_GROUP_SIZE = 5;
/** Preferred slab thickness as a share of the borne-off token size. */
const BEAR_OFF_SLAB_RATIO = 0.34;
const BEAR_OFF_MAX_SLAB = 12;
/** Keeps slabs long and thin (about 4:1) on a narrow tray. */
const BEAR_OFF_SLAB_ASPECT = 0.25;
/** Below this a slab is mostly rim and separator lines. */
const BEAR_OFF_PREFERRED_MIN_SLAB = 4;
const BEAR_OFF_MIN_SLAB = 3;

/**
 * Room kept at the hinge so a centered cube — sized by the tray width or the
 * corner clearance, then tilted — never covers a checker. This is only the
 * cube's intrusion into each half plus padding, not a full extra token.
 */
export function bearOffHingeReserve(options: {
  clearance?: number;
  bearOffWidth?: number;
  middleHeight?: number;
}): number {
  const clearance = options.clearance ?? 0;
  if (clearance <= 0) {
    return 0;
  }
  const maxTiltedEdge = options.bearOffWidth != null
    ? Math.min(Math.max(0, options.bearOffWidth - 4), clearance)
    : clearance;
  const halfCube = maxTiltedEdge / 2;
  const mid = options.middleHeight ?? 0;
  return Math.max(0, halfCube - mid / 2) + BEAR_OFF_PADDING;
}

export type BearOffStackLayout = {
  /** Distance from the tray's outer edge to the first slab (whole pixels). */
  start: number;
  /** Room from `start` to the hinge reserve. */
  available: number;
  thickness: number;
  /** Space between groups of five; slabs within a group touch and draw their own separator. */
  groupGap: number;
};

function stackLength(count: number, thickness: number, groupGap: number): number {
  if (count <= 0) {
    return 0;
  }
  return count * thickness + Math.floor((count - 1) / BEAR_OFF_GROUP_SIZE) * groupGap;
}

/**
 * Thin uniform slabs, like XG: every borne-off checker is the same thickness
 * whatever the count, stacked from the outer edge (past the cube's corner)
 * toward the hinge in groups of five. Slabs only get thinner on a tray too
 * short to hold all 15 at the preferred thickness. Values are whole pixels so
 * edges stay crisp, except on trays too short for 15 slabs of the minimum
 * thickness.
 */
export function bearOffStackLayout(options: {
  halfHeight: number;
  tokenSize: number;
  clearance?: number;
  bearOffWidth?: number;
  middleHeight?: number;
}): BearOffStackLayout {
  const clearance = options.clearance ?? 0;
  const hingeReserve = bearOffHingeReserve({
    clearance,
    bearOffWidth: options.bearOffWidth,
    middleHeight: options.middleHeight,
  });
  const start = Math.round(BEAR_OFF_PADDING + clearance);
  const available = Math.max(
    0,
    Math.floor(options.halfHeight - BEAR_OFF_PADDING - hingeReserve) - start,
  );
  const groupGapFor = (t: number) => Math.max(3, Math.round(t * 0.6));
  const widthCap = options.bearOffWidth != null
    ? Math.round((options.bearOffWidth - 7) * BEAR_OFF_SLAB_ASPECT)
    : BEAR_OFF_MAX_SLAB;
  let thickness = Math.max(
    BEAR_OFF_PREFERRED_MIN_SLAB,
    Math.min(BEAR_OFF_MAX_SLAB, widthCap, Math.round(options.tokenSize * BEAR_OFF_SLAB_RATIO)),
  );
  const fits = (t: number) =>
    stackLength(BEAR_OFF_MAX_CHECKERS, t, groupGapFor(t)) <= available;
  while (thickness > BEAR_OFF_MIN_SLAB && !fits(thickness)) {
    thickness -= 1;
  }
  if (!fits(thickness)) {
    // A very short tray: share what room there is, keeping a 1px break between fives.
    const groupGap = 1;
    const groupBreaks = Math.floor((BEAR_OFF_MAX_CHECKERS - 1) / BEAR_OFF_GROUP_SIZE);
    thickness = Math.max(1, (available - groupBreaks * groupGap) / BEAR_OFF_MAX_CHECKERS);
    return { start, available, thickness, groupGap };
  }
  return { start, available, thickness, groupGap: groupGapFor(thickness) };
}

/** Distance from `layout.start` to the leading edge of slab `slotIndex`. */
export function bearOffSlabOffset(layout: BearOffStackLayout, slotIndex: number): number {
  return stackLength(slotIndex + 1, layout.thickness, layout.groupGap) - layout.thickness;
}

/** Local top coordinate inside one bear-off half (top black / bottom white tray). */
export function bearOffSlotTopInSection(options: {
  clearance?: number;
  halfHeight: number;
  tokenSize: number;
  slotIndex: number;
  player: Player;
  bearOffWidth?: number;
  middleHeight?: number;
}): number {
  const layout = bearOffStackLayout(options);
  const offset = bearOffSlabOffset(layout, options.slotIndex);
  if (options.player === 'black') {
    return layout.start + offset;
  }
  return options.halfHeight - layout.start - offset - layout.thickness;
}

/** Centre Y of the newest borne-off slab, in board-local coordinates. */
export function bearOffCheckerCenterY(
  dims: BoardDimensions,
  player: Player,
  stackCount: number,
): number {
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const options = {
    clearance: dims.bearOffCubeClearance ?? 0,
    halfHeight,
    tokenSize: bearOffTokenSize(dims.checkerSize),
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
  };
  const { thickness } = bearOffStackLayout(options);
  const slotIndex = Math.min(Math.max(0, stackCount - 1), BEAR_OFF_MAX_CHECKERS - 1);
  const top = bearOffSlotTopInSection({ ...options, slotIndex, player });
  const sectionTop = player === 'black' ? 0 : halfHeight + dims.middleHeight;
  return sectionTop + top + thickness / 2;
}

export function bearOffCheckerCenterX(dims: BoardDimensions): number {
  return 12 * dims.colWidth + dims.barWidth + dims.bearOffWidth / 2;
}

/** Room kept at each tray's outer corner for the doubling cube. */
export function cubeCornerClearance(pointHeight: number): number {
  return 36 * Math.min(1, pointHeight / 90);
}

/**
 * Board-local centre of the cube's row in the bear-off tray: its owner's outer
 * corner, or the hinge while nobody owns it. Shared by games and the editor.
 */
export function cubeCenterY(dims: BoardDimensions, owner: Player | null): number {
  const clearance = dims.bearOffCubeClearance ?? cubeCornerClearance(dims.pointHeight);
  if (owner === 'black')
    return BEAR_OFF_PADDING + clearance / 2;
  if (owner === 'white')
    return dims.boardHeight - BEAR_OFF_PADDING - clearance / 2;
  return dims.boardHeight / 2;
}

/** A cube is drawn tilted by 6°, which widens its footprint by about 10%. */
const CUBE_TILT_GROWTH = 1.1;

/**
 * The largest cube edge that stays inside the tray: narrower than the tray
 * and inside its owner's corner. Stacks stop at `bearOffHingeReserve`, which
 * is sized from this same width/corner cap, so a centred cube stays clear.
 */
export function maxCubeEdge(dims: BoardDimensions): number {
  const clearance = dims.bearOffCubeClearance ?? cubeCornerClearance(dims.pointHeight);
  return Math.max(8, Math.min(dims.bearOffWidth - 4, clearance) / CUBE_TILT_GROWTH);
}
