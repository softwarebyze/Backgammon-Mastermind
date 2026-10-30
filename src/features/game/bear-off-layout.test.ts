import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import {
  bearOffCheckerCenterY,
  bearOffHalfHeight,
  bearOffSlotTopInSection,
  bearOffStackStep,
  bearOffTokenSize,
  cubeCenterY,
  cubeCornerClearance,
  maxBearOffVisibleSlots,
  maxCubeEdge,
} from '@/features/game/bear-off-layout';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';

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

it.each(['black', 'white'] as const)('keeps a full %s bear-off stack clear of the cube corner and aligns animation anchors', (player) => {
  const dims = { ...TEST_DIMS, bearOffCubeClearance: 36 };
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const tokenSize = bearOffTokenSize(dims.checkerSize);
  const visibleCount = Math.min(15, maxBearOffVisibleSlots(halfHeight, tokenSize, 36));
  const firstTop = bearOffSlotTopInSection({ halfHeight, tokenSize, visibleCount, slotIndex: 0, player, clearance: 36 });
  const lastTop = bearOffSlotTopInSection({ halfHeight, tokenSize, visibleCount, slotIndex: visibleCount - 1, player, clearance: 36 });
  // The cube owns the outer corner; the stack grows from there toward the hinge, inside its half.
  if (player === 'black') {
    expect(firstTop).toBeGreaterThanOrEqual(36);
    expect(lastTop + tokenSize).toBeLessThanOrEqual(halfHeight);
  }
  else {
    expect(firstTop + tokenSize).toBeLessThanOrEqual(halfHeight - 36);
    expect(lastTop).toBeGreaterThanOrEqual(0);
  }
  const sectionTop = player === 'black' ? 0 : halfHeight + dims.middleHeight;
  expect(bearOffCheckerCenterY(dims, player, 15)).toBe(sectionTop + lastTop + tokenSize / 2);
});

describe('maxCubeEdge', () => {
  // 375×560 is a short phone browser: the board is small and the tray narrow.
  it.each([[260, 200], [343, 250], [358, 420], [700, 520]])('keeps a %ix%i board\'s cube clear of full stacks', (width, height) => {
    const base = fitBoardToViewport(width, height, { extraHeight: 36 });
    const dims = { ...base, bearOffCubeClearance: cubeCornerClearance(base.pointHeight) };
    const half = (maxCubeEdge(dims) * 1.1) / 2;
    const token = bearOffTokenSize(dims.checkerSize);
    // Centred: clear of the top of White's and the bottom of Black's 15-checker stacks.
    expect(cubeCenterY(dims, null) + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'white', 15) - token / 2);
    expect(cubeCenterY(dims, null) - half).toBeGreaterThanOrEqual(bearOffCheckerCenterY(dims, 'black', 15) + token / 2);
    // In a corner: above the first borne-off checker.
    expect(cubeCenterY(dims, 'black') + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'black', 1) - token / 2);
    // Never wider than the tray.
    expect(half * 2).toBeLessThanOrEqual(dims.bearOffWidth);
  });
});
