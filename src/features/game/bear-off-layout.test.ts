import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import {
  BEAR_OFF_MAX_CHECKERS,
  BEAR_OFF_PADDING,
  bearOffCheckerCenterY,
  bearOffHalfHeight,
  bearOffHingeReserve,
  bearOffSlotTopInSection,
  bearOffStackLayout,
  bearOffTokenSize,
  cubeCenterY,
  cubeCornerClearance,
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

function layoutOpts(dims: BoardDimensions, clearance = 0) {
  return {
    halfHeight: bearOffHalfHeight(dims.boardHeight, dims.middleHeight),
    tokenSize: bearOffTokenSize(dims.checkerSize),
    clearance,
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
  };
}

function blackTops(dims: BoardDimensions, clearance = 0) {
  return Array.from({ length: BEAR_OFF_MAX_CHECKERS }, (_, slotIndex) =>
    bearOffSlotTopInSection({ ...layoutOpts(dims, clearance), slotIndex, player: 'black' }));
}

describe('bearOffStackLayout', () => {
  it('stacks 15 thin slabs in groups of five without overlap, clear of the centred cube', () => {
    const dims = { ...TEST_DIMS, boardHeight: 360 };
    const opts = layoutOpts(dims, 36);
    const { thickness } = bearOffStackLayout(opts);
    const tops = blackTops(dims, 36);
    const steps = tops.slice(1).map((top, i) => top - tops[i]);

    expect(thickness).toBeLessThan(opts.tokenSize / 2);
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(thickness);
    // A wider break after every fifth slab makes the stack easy to count.
    expect(steps[4]).toBeGreaterThan(steps[3]);
    expect(steps[9]).toBe(steps[4]);
    const reserve = bearOffHingeReserve(opts);
    expect(tops[14] + thickness).toBeLessThanOrEqual(opts.halfHeight - BEAR_OFF_PADDING - reserve);
  });

  it('keeps one slab thickness on a tall tray and thins it only on a short one', () => {
    const tall = bearOffStackLayout(layoutOpts({ ...TEST_DIMS, boardHeight: 400 }));
    expect(bearOffStackLayout(layoutOpts({ ...TEST_DIMS, boardHeight: 500 })).thickness).toBe(tall.thickness);
    for (const boardHeight of [200, 120]) {
      const dims = { ...TEST_DIMS, boardHeight };
      const short = bearOffStackLayout(layoutOpts(dims, 20));
      expect(short.thickness).toBeLessThan(tall.thickness);
      expect(blackTops(dims, 20)[14] + short.thickness).toBeLessThanOrEqual(short.start + short.available + 1e-9);
    }
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

it.each(['black', 'white'] as const)('keeps a %s stack out of the cube corner and lands the animation on the newest slab', (player) => {
  const dims = { ...TEST_DIMS, boardHeight: 360, bearOffCubeClearance: 36 };
  const opts = layoutOpts(dims, 36);
  const { thickness } = bearOffStackLayout(opts);
  const firstTop = bearOffSlotTopInSection({ ...opts, slotIndex: 0, player });
  const seventhTop = bearOffSlotTopInSection({ ...opts, slotIndex: 6, player });
  if (player === 'black') {
    expect(firstTop).toBeGreaterThanOrEqual(BEAR_OFF_PADDING + 36);
  }
  else {
    expect(firstTop + thickness).toBeLessThanOrEqual(opts.halfHeight - BEAR_OFF_PADDING - 36);
  }
  const sectionTop = player === 'black' ? 0 : opts.halfHeight + dims.middleHeight;
  expect(bearOffCheckerCenterY(dims, player, 7)).toBe(sectionTop + seventhTop + thickness / 2);
});

describe('maxCubeEdge', () => {
  // 375×560 is a short phone browser: the board is small and the tray narrow.
  it.each([[260, 200], [343, 250], [358, 420], [700, 520]])('keeps a %ix%i board\'s cube clear of full stacks', (width, height) => {
    const base = fitBoardToViewport(width, height, { extraHeight: 36 });
    const dims = { ...base, bearOffCubeClearance: cubeCornerClearance(base.pointHeight) };
    const half = (maxCubeEdge(dims) * 1.1) / 2;
    const slab = bearOffStackLayout(layoutOpts(dims, dims.bearOffCubeClearance)).thickness;
    // Centred: clear of the top of White's and the bottom of Black's 15-checker stacks.
    expect(cubeCenterY(dims, null) + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'white', 15) - slab / 2 + 1e-6);
    expect(cubeCenterY(dims, null) - half).toBeGreaterThanOrEqual(bearOffCheckerCenterY(dims, 'black', 15) + slab / 2 - 1e-6);
    // In a corner: above the first borne-off checker.
    expect(cubeCenterY(dims, 'black') + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'black', 1) - slab / 2 + 1e-6);
    // Never wider than the tray.
    expect(half * 2).toBeLessThanOrEqual(dims.bearOffWidth);
  });
});
