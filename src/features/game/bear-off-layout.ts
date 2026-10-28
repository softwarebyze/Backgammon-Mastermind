import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';

/** Matches BearOffArea token sizing — keep in sync with animation end scale. */
const BEAR_OFF_TOKEN_SCALE = 0.78;
export const BEAR_OFF_PADDING = 4;
export const BEAR_OFF_LABEL_HEIGHT = 10;
/** Minimum vertical step between borne-off checkers (allows overlap). */
const BEAR_OFF_MIN_STEP = 4;

export function bearOffTokenSize(checkerSize: number): number {
  return Math.round(checkerSize * BEAR_OFF_TOKEN_SCALE);
}

export function bearOffHalfHeight(boardHeight: number, middleHeight: number): number {
  return (boardHeight - middleHeight) / 2;
}

export function bearOffStackStep(halfHeight: number, tokenSize: number, visibleCount: number): number {
  if (visibleCount <= 1) {
    return 0;
  }
  const available = halfHeight - BEAR_OFF_PADDING * 2 - BEAR_OFF_LABEL_HEIGHT - tokenSize;
  const step = (available - tokenSize) / (visibleCount - 1);
  return Math.min(tokenSize - 3, Math.max(BEAR_OFF_MIN_STEP, step));
}

export function maxBearOffVisibleSlots(halfHeight: number, tokenSize: number, clearance = 0): number {
  const available = halfHeight - clearance - BEAR_OFF_PADDING * 2 - BEAR_OFF_LABEL_HEIGHT - tokenSize;
  if (available <= 0) {
    return 1;
  }
  return 1 + Math.floor(available / BEAR_OFF_MIN_STEP);
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
  const visible = Math.min(stackCount, maxBearOffVisibleSlots(halfHeight, tokenSize, clearance));
  const slotIndex = visible - 1;
  const step = bearOffStackStep(halfHeight - clearance, tokenSize, visible);

  if (player === 'black') {
    return BEAR_OFF_PADDING + BEAR_OFF_LABEL_HEIGHT + tokenSize / 2 + slotIndex * step;
  }

  const sectionTop = halfHeight + dims.middleHeight;
  const yInSection = halfHeight - BEAR_OFF_PADDING - tokenSize / 2 - slotIndex * step;
  return sectionTop + yInSection;
}

export function bearOffCheckerCenterX(dims: BoardDimensions): number {
  return 12 * dims.colWidth + dims.barWidth + dims.bearOffWidth / 2;
}

/** Local top coordinate inside one bear-off half (top black / bottom white tray). */
export function bearOffSlotTopInSection(options: {
  clearance?: number;
  halfHeight: number;
  tokenSize: number;
  visibleCount: number;
  slotIndex: number;
  player: Player;
}): number {
  const { halfHeight, tokenSize, visibleCount, slotIndex, player, clearance = 0 } = options;
  const step = bearOffStackStep(halfHeight - clearance, tokenSize, visibleCount);

  if (player === 'black') {
    return BEAR_OFF_PADDING + BEAR_OFF_LABEL_HEIGHT + slotIndex * step;
  }

  return halfHeight - BEAR_OFF_PADDING - tokenSize - slotIndex * step;
}
