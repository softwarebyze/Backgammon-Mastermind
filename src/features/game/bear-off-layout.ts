import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState } from '@/lib/game';
import type { Player } from '@/lib/game/types';
import { opponent } from '@/lib/game/moves';

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
 * The cube's widest extent once tilted: narrower than the tray and inside its
 * owner's corner (`clearance`). 0 on a board without a cube.
 */
function cubeSpan(options: { clearance?: number; bearOffWidth?: number }): number {
  const clearance = options.clearance ?? 0;
  if (clearance <= 0) {
    return 0;
  }
  return options.bearOffWidth != null ? Math.min(Math.max(0, options.bearOffWidth - 4), clearance) : clearance;
}

/**
 * Room kept at the hinge so a centred cube never covers a checker or the
 * count: only its intrusion into each half plus padding.
 */
export function bearOffHingeReserve(options: {
  clearance?: number;
  bearOffWidth?: number;
  middleHeight?: number;
}): number {
  const span = cubeSpan(options);
  return span > 0 ? Math.max(0, span / 2 - (options.middleHeight ?? 0) / 2) + BEAR_OFF_PADDING : 0;
}

/** Room an owned cube takes at its owner's outer corner, including the gap to the first checker. */
function cornerReserve(options: { clearance?: number; bearOffWidth?: number }): number {
  const span = cubeSpan(options);
  return span > 0 ? Math.ceil(span) + 2 : 0;
}

export type BearOffStackLayout = {
  /** Distance from the tray's outer edge to the first checker. */
  start: number;
  /** Room from `start` to the count, past which the hinge stays clear. */
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
 * toward the hinge. When this half's player owns the cube it sits in that
 * outer corner, as in XG, and the stack starts just past it (the hinge is
 * then free). Checkers only get thinner on a half too short for 15 at the
 * preferred thickness. Whole pixels so edges stay crisp, except on trays too
 * short for 15 of the minimum thickness.
 */
export function bearOffStackLayout(options: {
  halfHeight: number;
  tokenSize: number;
  clearance?: number;
  bearOffWidth?: number;
  middleHeight?: number;
  /** The cube sits in this half's outer corner. */
  cubeInCorner?: boolean;
}): BearOffStackLayout {
  const start = BEAR_OFF_PADDING + (options.cubeInCorner ? cornerReserve(options) : 0);
  const hinge = options.cubeInCorner ? 0 : bearOffHingeReserve(options);
  const available = Math.max(0, Math.floor(options.halfHeight - BEAR_OFF_PADDING - hinge - BEAR_OFF_COUNT_HEIGHT) - start);
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
  clearance?: number;
  halfHeight: number;
  tokenSize: number;
  slotIndex: number;
  player: Player;
  bearOffWidth?: number;
  middleHeight?: number;
  cubeInCorner?: boolean;
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
    clearance: dims.bearOffCubeClearance ?? 0,
    halfHeight,
    tokenSize: bearOffTokenSize(dims.checkerSize),
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
    cubeInCorner: dims.bearOffCubeCorner === player,
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
  const span = cubeSpan({ clearance: dims.bearOffCubeClearance ?? cubeCornerClearance(dims.pointHeight), bearOffWidth: dims.bearOffWidth });
  if (owner === 'black')
    return BEAR_OFF_PADDING + span / 2;
  if (owner === 'white')
    return dims.boardHeight - BEAR_OFF_PADDING - span / 2;
  return dims.boardHeight / 2;
}

/** Whose outer corner the cube is drawn in: the owner's, or the taker's while a double is offered. */
export function cubeCorner(match: GameState['match']): Player | null {
  if (!match) {
    return null;
  }
  if (match.pendingOffer) {
    return opponent(match.pendingOffer);
  }
  return match.cube.owner === 'center' ? null : match.cube.owner;
}

/** A cube is drawn tilted by 6°, which widens its footprint by about 10%. */
const CUBE_TILT_GROWTH = 1.1;

/**
 * The largest cube edge that stays inside the tray: narrower than the tray
 * and inside its owner's corner. Stacks leave this same span clear at the
 * hinge and in the owner's corner.
 */
export function maxCubeEdge(dims: BoardDimensions): number {
  const clearance = dims.bearOffCubeClearance ?? cubeCornerClearance(dims.pointHeight);
  return Math.max(8, cubeSpan({ clearance, bearOffWidth: dims.bearOffWidth }) / CUBE_TILT_GROWTH);
}
