import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import {
  bearOffCheckerCenterY,
  bearOffHalfHeight,
  bearOffSlotTopInSection,
  bearOffStackStep,
  bearOffTokenSize,
  maxBearOffVisibleSlots,
} from '@/features/game/bear-off-layout';

const TEST_DIMS: BoardDimensions = {
  boardWidth: 400,
  boardHeight: 200,
  boardFrameWidth: 4,
  boardOuterWidth: 408,
  boardOuterHeight: 208,
  colWidth: 28,
  checkerSize: 24,
  pointHeight: 94,
  barWidth: 28,
  bearOffWidth: 38,
  middleHeight: 12,
};

describe('bearOffStackStep', () => {
  it('uses overlapping steps so many checkers fit below the center groove', () => {
    const halfHeight = bearOffHalfHeight(TEST_DIMS.boardHeight, TEST_DIMS.middleHeight);
    const tokenSize = bearOffTokenSize(TEST_DIMS.checkerSize);
    const step = bearOffStackStep(halfHeight, tokenSize, 7);
    const topSlot = bearOffSlotTopInSection({
      halfHeight,
      tokenSize,
      visibleCount: 7,
      slotIndex: 6,
      player: 'white',
    });

    expect(step).toBeLessThan(tokenSize);
    expect(topSlot).toBeGreaterThanOrEqual(0);
    expect(topSlot + tokenSize).toBeLessThanOrEqual(halfHeight);
  });

  it('supports at least 12 visible slots in a standard tray half', () => {
    const halfHeight = bearOffHalfHeight(TEST_DIMS.boardHeight, TEST_DIMS.middleHeight);
    const tokenSize = bearOffTokenSize(TEST_DIMS.checkerSize);
    expect(maxBearOffVisibleSlots(halfHeight, tokenSize)).toBeGreaterThanOrEqual(12);
  });
});

describe('bearOffCheckerCenterY', () => {
  it('places later borne-off checkers closer to the tray top without crossing the groove', () => {
    const first = bearOffCheckerCenterY(TEST_DIMS, 'white', 1);
    const seventh = bearOffCheckerCenterY(TEST_DIMS, 'white', 7);
    const grooveTop = bearOffHalfHeight(TEST_DIMS.boardHeight, TEST_DIMS.middleHeight);

    expect(seventh).toBeLessThan(first);
    expect(seventh).toBeGreaterThanOrEqual(grooveTop);
  });
});

it.each(['black', 'white'] as const)('keeps a full %s bear-off stack clear of the match cube and aligns animation anchors', (player) => {
  const dims = { ...TEST_DIMS, bearOffCubeClearance: 36 };
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const tokenSize = bearOffTokenSize(dims.checkerSize);
  const visibleCount = Math.min(15, maxBearOffVisibleSlots(halfHeight, tokenSize, 36));
  const lastTop = bearOffSlotTopInSection({ halfHeight, tokenSize, visibleCount, slotIndex: visibleCount - 1, player, clearance: 36 });
  if (player === 'black')
    expect(lastTop + tokenSize).toBeLessThanOrEqual(halfHeight - 36);
  else
    expect(lastTop).toBeGreaterThanOrEqual(36);
  const sectionTop = player === 'black' ? 0 : halfHeight + dims.middleHeight;
  expect(bearOffCheckerCenterY(dims, player, 15)).toBe(sectionTop + lastTop + tokenSize / 2);
});
