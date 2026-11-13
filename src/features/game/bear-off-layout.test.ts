import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import {
  BEAR_OFF_MAX_CHECKERS,
  BEAR_OFF_PADDING,
  bearOffCheckerCenterY,
  bearOffHalfHeight,
  bearOffHingeReserve,
  bearOffMaxSlabThickness,
  bearOffSlotTopInSection,
  bearOffStackLayout,
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

function layoutOpts(dims: BoardDimensions, count: number, clearance = 0) {
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const tokenSize = bearOffTokenSize(dims.checkerSize);
  return {
    halfHeight,
    tokenSize,
    count,
    clearance,
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
  };
};

describe('bearOffStackLayout', () => {
  it('spreads a short stack across the tray instead of overlapping at the outer edge', () => {
    const tokenSize = bearOffTokenSize(TEST_DIMS.checkerSize);
    const layout = bearOffStackLayout(layoutOpts(TEST_DIMS, 7));
    const lastTop = bearOffSlotTopInSection({
      halfHeight: layoutOpts(TEST_DIMS, 7).halfHeight,
      tokenSize,
      visibleCount: 7,
      slotIndex: 6,
      player: 'white',
      bearOffWidth: TEST_DIMS.bearOffWidth,
      middleHeight: TEST_DIMS.middleHeight,
    });

    expect(layout.thickness).toBeLessThanOrEqual(tokenSize);
    expect(lastTop).toBeGreaterThanOrEqual(0);
    expect(lastTop + layout.thickness).toBeLessThanOrEqual(layoutOpts(TEST_DIMS, 7).halfHeight);
    // First and last span the available height (padding to padding when no cube).
    const firstTop = bearOffSlotTopInSection({
      halfHeight: layoutOpts(TEST_DIMS, 7).halfHeight,
      tokenSize,
      visibleCount: 7,
      slotIndex: 0,
      player: 'white',
      bearOffWidth: TEST_DIMS.bearOffWidth,
      middleHeight: TEST_DIMS.middleHeight,
    });
    expect(firstTop + layout.thickness).toBeCloseTo(
      layoutOpts(TEST_DIMS, 7).halfHeight - BEAR_OFF_PADDING,
      5,
    );
    expect(lastTop).toBeCloseTo(BEAR_OFF_PADDING, 5);
  });

  it('only thins slabs once 15 would not fit at full thickness', () => {
    const mid = { ...TEST_DIMS, boardHeight: 400, pointHeight: 194 };
    const tokenSize = bearOffTokenSize(mid.checkerSize);
    const seven = bearOffStackLayout(layoutOpts(mid, 7));
    const fifteen = bearOffStackLayout(layoutOpts(mid, 15));
    expect(seven.thickness).toBe(bearOffMaxSlabThickness(tokenSize));
    expect(seven.step).toBeGreaterThanOrEqual(seven.thickness);
    expect(fifteen.thickness).toBeLessThan(tokenSize);
    expect(fifteen.step).toBeCloseTo(fifteen.thickness, 5);
    expect(fifteen.thickness * 15).toBeCloseTo(fifteen.available, 5);
  });

  it('always has room for all 15 checkers', () => {
    expect(maxBearOffVisibleSlots()).toBe(BEAR_OFF_MAX_CHECKERS);
    const halfHeight = bearOffHalfHeight(TEST_DIMS.boardHeight, TEST_DIMS.middleHeight);
    const tokenSize = bearOffTokenSize(TEST_DIMS.checkerSize);
    const layout = bearOffStackLayout(layoutOpts(TEST_DIMS, 15));
    expect(layout.thickness * 15).toBeCloseTo(layout.available, 5);
    const last = bearOffSlotTopInSection({
      halfHeight,
      tokenSize,
      visibleCount: 15,
      slotIndex: 14,
      player: 'white',
      bearOffWidth: TEST_DIMS.bearOffWidth,
      middleHeight: TEST_DIMS.middleHeight,
    });
    expect(last).toBeGreaterThanOrEqual(0);
    expect(last + layout.thickness).toBeLessThanOrEqual(halfHeight);
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
  const visibleCount = 15;
  const layout = bearOffStackLayout(layoutOpts(dims, visibleCount, 36));
  const firstTop = bearOffSlotTopInSection({ halfHeight, tokenSize, visibleCount, slotIndex: 0, player, clearance: 36, bearOffWidth: dims.bearOffWidth, middleHeight: dims.middleHeight });
  const lastTop = bearOffSlotTopInSection({ halfHeight, tokenSize, visibleCount, slotIndex: visibleCount - 1, player, clearance: 36, bearOffWidth: dims.bearOffWidth, middleHeight: dims.middleHeight });
  if (player === 'black') {
    expect(firstTop).toBeGreaterThanOrEqual(36);
    expect(lastTop + layout.thickness).toBeLessThanOrEqual(halfHeight);
  }
  else {
    expect(firstTop + layout.thickness).toBeLessThanOrEqual(halfHeight - 36);
    expect(lastTop).toBeGreaterThanOrEqual(0);
  }
  const sectionTop = player === 'black' ? 0 : halfHeight + dims.middleHeight;
  expect(bearOffCheckerCenterY(dims, player, 15)).toBeCloseTo(sectionTop + lastTop + layout.thickness / 2, 5);
});

it('lets a full stack reach the hinge reserve instead of stopping a token short of the middle', () => {
  const dims = { ...TEST_DIMS, bearOffCubeClearance: 36 };
  const halfHeight = bearOffHalfHeight(dims.boardHeight, dims.middleHeight);
  const tokenSize = bearOffTokenSize(dims.checkerSize);
  const reserve = bearOffHingeReserve({ clearance: 36, bearOffWidth: dims.bearOffWidth, middleHeight: dims.middleHeight });
  const lastBlackBottom = bearOffSlotTopInSection({
    halfHeight,
    tokenSize,
    visibleCount: 15,
    slotIndex: 14,
    player: 'black',
    clearance: 36,
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
  }) + bearOffStackLayout(layoutOpts(dims, 15, 36)).thickness;
  expect(lastBlackBottom).toBeCloseTo(halfHeight - BEAR_OFF_PADDING - reserve, 5);
  expect(reserve).toBeLessThan(tokenSize);
});

describe('maxCubeEdge', () => {
  // 375×560 is a short phone browser: the board is small and the tray narrow.
  it.each([[260, 200], [343, 250], [358, 420], [700, 520]])('keeps a %ix%i board\'s cube clear of full stacks', (width, height) => {
    const base = fitBoardToViewport(width, height, { extraHeight: 36 });
    const dims = { ...base, bearOffCubeClearance: cubeCornerClearance(base.pointHeight) };
    const half = (maxCubeEdge(dims) * 1.1) / 2;
    const token = bearOffTokenSize(dims.checkerSize);
    const slab = bearOffStackLayout({
      halfHeight: bearOffHalfHeight(dims.boardHeight, dims.middleHeight),
      tokenSize: token,
      count: 15,
      clearance: dims.bearOffCubeClearance,
      bearOffWidth: dims.bearOffWidth,
      middleHeight: dims.middleHeight,
    }).thickness;
    // Centred: clear of the top of White's and the bottom of Black's 15-checker stacks.
    expect(cubeCenterY(dims, null) + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'white', 15) - slab / 2 + 1e-6);
    expect(cubeCenterY(dims, null) - half).toBeGreaterThanOrEqual(bearOffCheckerCenterY(dims, 'black', 15) + slab / 2 - 1e-6);
    // In a corner: above the first borne-off checker.
    expect(cubeCenterY(dims, 'black') + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'black', 1) - slab / 2 + 1e-6);
    // Never wider than the tray.
    expect(half * 2).toBeLessThanOrEqual(dims.bearOffWidth);
  });
});
