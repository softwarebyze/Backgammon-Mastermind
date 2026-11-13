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

/**
 * Max edge-on slab thickness. At or below this, checkers sit face-to-face
 * (no overlap). They only get thinner when that many would not fit.
 */
export function bearOffMaxSlabThickness(tokenSize: number): number {
  return tokenSize;
}

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
  available: number;
  thickness: number;
  step: number;
  hingeReserve: number;
};

/**
 * Evenly space `count` borne-off checkers across the whole tray half, after
 * the outer cube corner and short of the centered cube. A single checker sits
 * at the outer edge. Two or more span the available height. Slab thickness
 * stays at the face size until that many would not fit, then they thin so
 * all 15 still fill the tray.
 */
export function bearOffStackLayout(options: {
  halfHeight: number;
  tokenSize: number;
  count: number;
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
  const available = Math.max(
    0,
    options.halfHeight - BEAR_OFF_PADDING * 2 - clearance - hingeReserve,
  );
  const count = Math.max(0, options.count);
  const maxThickness = bearOffMaxSlabThickness(options.tokenSize);
  const thickness = count <= 0 ? 0 : Math.min(maxThickness, available / count);
  const step = count <= 1 ? 0 : (available - thickness) / (count - 1);
  return { available, thickness, step, hingeReserve };
}

/** All 15 always fit; the stack thins instead of overflowing to "+N". */
export function maxBearOffVisibleSlots(
  _halfHeight?: number,
  _tokenSize?: number,
  _clearance?: number,
): number {
  return BEAR_OFF_MAX_CHECKERS;
}

/** Local top coordinate inside one bear-off half (top black / bottom white tray). */
export function bearOffSlotTopInSection(options: {
  clearance?: number;
  halfHeight: number;
  tokenSize: number;
  visibleCount: number;
  slotIndex: number;
  player: Player;
  bearOffWidth?: number;
  middleHeight?: number;
}): number {
  const { halfHeight, tokenSize, visibleCount, slotIndex, player, clearance = 0 } = options;
  const { thickness, step } = bearOffStackLayout({
    halfHeight,
    tokenSize,
    count: visibleCount,
    clearance,
    bearOffWidth: options.bearOffWidth,
    middleHeight: options.middleHeight,
  });

  if (player === 'black') {
    return BEAR_OFF_PADDING + clearance + slotIndex * step;
  }

  return halfHeight - BEAR_OFF_PADDING - clearance - thickness - slotIndex * step;
}

/** Checker center Y in board-local coordinates. */
export function bearOffCheckerCenterY(
  dims: BoardDimensions,
  player: Player,
  stackCount: number,
): number {
  const clearance = dims.bearOffCubeClearance ?? 0;
  const tokenSize = bearOffTokenSize(dims.checkerSize);
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const count = Math.min(Math.max(0, stackCount), BEAR_OFF_MAX_CHECKERS);
  const layout = bearOffStackLayout({
    halfHeight,
    tokenSize,
    count,
    clearance,
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
  });
  const slotIndex = Math.max(0, count - 1);

  if (player === 'black') {
    return BEAR_OFF_PADDING + clearance + layout.thickness / 2 + slotIndex * layout.step;
  }

  const sectionTop = halfHeight + dims.middleHeight;
  const yInSection
    = halfHeight - BEAR_OFF_PADDING - clearance - layout.thickness / 2 - slotIndex * layout.step;
  return sectionTop + yInSection;
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
