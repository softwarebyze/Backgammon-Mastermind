import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';

/** Matches BearOffArea token face size — keep in sync with animation end scale. */
const BEAR_OFF_TOKEN_SCALE = 0.78;
export const BEAR_OFF_PADDING = 4;
/** Every checker in a 15-checker set is drawn; nothing is hidden behind "+N". */
export const BEAR_OFF_MAX_CHECKERS = 15;
/** Room for the count that follows the newest borne-off checker. */
export const BEAR_OFF_COUNT_HEIGHT = 12;

export function bearOffTokenSize(checkerSize: number): number {
  return Math.round(checkerSize * BEAR_OFF_TOKEN_SCALE);
}

export function bearOffHalfHeight(boardHeight: number, middleHeight: number): number {
  return (boardHeight - middleHeight) / 2;
}

/** Preferred thickness of an edge-on checker as a share of the borne-off token size. */
const BEAR_OFF_PIECE_RATIO = 0.42;
const BEAR_OFF_MAX_PIECE = 9;
const BEAR_OFF_MIN_PIECE = 2;

/**
 * Room kept at the hinge so a centred cube, at most `cubeFootprint` across once
 * tilted, never covers a checker or the count: only its intrusion into each
 * half plus padding.
 */
export function bearOffHingeReserve(options: { cubeFootprint?: number; middleHeight?: number }): number {
  const footprint = options.cubeFootprint ?? 0;
  if (footprint <= 0) {
    return 0;
  }
  return Math.max(0, footprint / 2 - (options.middleHeight ?? 0) / 2) + BEAR_OFF_PADDING;
}

export type BearOffStackLayout = {
  /** Distance from the tray's outer edge to the first checker. */
  start: number;
  /** Room from `start` to the count above the hinge reserve. */
  available: number;
  thickness: number;
  /** Even space between neighbouring checkers. */
  gap: number;
};

function stackLength(count: number, thickness: number, gap: number): number {
  return count <= 0 ? 0 : count * thickness + (count - 1) * gap;
}

const gapFor = (thickness: number) => (thickness >= 7 ? 2 : 1);

/**
 * Borne-off checkers seen edge-on, as in Galaxy and Sage: one thickness
 * whatever the count, evenly spaced, stacked flush from the tray's outer edge
 * toward the hinge. They only get thinner on a tray too short for 15 at the
 * preferred thickness. Whole pixels so edges stay crisp, except on trays too
 * short for 15 of the minimum thickness.
 */
export function bearOffStackLayout(options: {
  halfHeight: number;
  tokenSize: number;
  cubeFootprint?: number;
  middleHeight?: number;
}): BearOffStackLayout {
  const start = BEAR_OFF_PADDING;
  const available = Math.max(
    0,
    Math.floor(options.halfHeight - BEAR_OFF_PADDING - bearOffHingeReserve(options) - BEAR_OFF_COUNT_HEIGHT) - start,
  );
  let thickness = Math.max(BEAR_OFF_MIN_PIECE, Math.min(BEAR_OFF_MAX_PIECE, Math.round(options.tokenSize * BEAR_OFF_PIECE_RATIO)));
  const fits = (t: number) => stackLength(BEAR_OFF_MAX_CHECKERS, t, gapFor(t)) <= available;
  while (thickness > BEAR_OFF_MIN_PIECE && !fits(thickness)) {
    thickness -= 1;
  }
  if (!fits(thickness)) {
    // A very short tray: share what room there is, each gap half a checker.
    const share = available / (BEAR_OFF_MAX_CHECKERS + (BEAR_OFF_MAX_CHECKERS - 1) / 2);
    return { start, available, thickness: share, gap: share / 2 };
  }
  return { start, available, thickness, gap: gapFor(thickness) };
}

/** Distance from `layout.start` to the leading edge of checker `slotIndex`. */
export function bearOffSlabOffset(layout: BearOffStackLayout, slotIndex: number): number {
  return slotIndex * (layout.thickness + layout.gap);
}

/** Local top coordinate inside one bear-off half (top black / bottom white tray). */
export function bearOffSlotTopInSection(options: {
  cubeFootprint?: number;
  halfHeight: number;
  tokenSize: number;
  slotIndex: number;
  player: Player;
  middleHeight?: number;
}): number {
  const layout = bearOffStackLayout(options);
  const offset = bearOffSlabOffset(layout, options.slotIndex);
  if (options.player === 'black') {
    return layout.start + offset;
  }
  return options.halfHeight - layout.start - offset - layout.thickness;
}

/** Centre Y of the newest borne-off checker, in board-local coordinates. */
export function bearOffCheckerCenterY(
  dims: BoardDimensions,
  player: Player,
  stackCount: number,
): number {
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const options = {
    cubeFootprint: dims.cubeFootprint,
    halfHeight,
    tokenSize: bearOffTokenSize(dims.checkerSize),
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

/** A cube is drawn tilted by 6°, which widens its footprint by about 10%. */
const CUBE_TILT_GROWTH = 1.1;

/**
 * The tilted cube's footprint on a board this size: narrower than the tray
 * and the bar it moves between, and no more than 40% of a point (36px max).
 * Boards that show a cube set this as `cubeFootprint`.
 */
export function cubeFootprint(dims: Pick<BoardDimensions, 'pointHeight' | 'bearOffWidth' | 'barWidth'>): number {
  return Math.min(dims.bearOffWidth - 4, dims.barWidth, 36 * Math.min(1, dims.pointHeight / 90));
}

/**
 * Board-local centre of the cube: on the tray's hinge while nobody owns it,
 * otherwise at its owner's end of the centre bar, so the tray never keeps an
 * empty corner. Bar stacks leave that end clear (see `barStackLayout`).
 * Shared by games and the editor.
 */
export function cubeCenter(dims: BoardDimensions, owner: Player | null): { x: number; y: number } {
  if (owner === null) {
    return { x: bearOffCheckerCenterX(dims), y: dims.boardHeight / 2 };
  }
  const half = (dims.cubeFootprint ?? cubeFootprint(dims)) / 2;
  const x = 6 * dims.colWidth + dims.barWidth / 2;
  return { x, y: owner === 'black' ? BEAR_OFF_PADDING + half : dims.boardHeight - BEAR_OFF_PADDING - half };
}

/** The largest cube edge that, tilted, stays inside its footprint. */
export function maxCubeEdge(dims: BoardDimensions): number {
  return Math.max(8, (dims.cubeFootprint ?? cubeFootprint(dims)) / CUBE_TILT_GROWTH);
}
