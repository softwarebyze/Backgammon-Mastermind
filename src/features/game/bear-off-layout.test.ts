import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import { barStackLayout, MAX_BAR_VISIBLE } from '@/features/game/bar-stack-layout';
import {
  BEAR_OFF_COUNT_HEIGHT,
  BEAR_OFF_MAX_CHECKERS,
  BEAR_OFF_PADDING,
  bearOffCheckerCenterY,
  bearOffHalfHeight,
  bearOffHingeReserve,
  bearOffSlotTopInSection,
  bearOffStackLayout,
  bearOffTokenSize,
  cubeCenter,
  cubeFootprint,
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

function layoutOpts(dims: BoardDimensions, footprint = 0) {
  return {
    halfHeight: bearOffHalfHeight(dims.boardHeight, dims.middleHeight),
    tokenSize: bearOffTokenSize(dims.checkerSize),
    cubeFootprint: footprint,
    middleHeight: dims.middleHeight,
  };
}

function tops(dims: BoardDimensions, player: 'black' | 'white', footprint = 0) {
  return Array.from({ length: BEAR_OFF_MAX_CHECKERS }, (_, slotIndex) =>
    bearOffSlotTopInSection({ ...layoutOpts(dims, footprint), slotIndex, player }));
}

describe('bearOffStackLayout', () => {
  it('stacks 15 evenly spaced checkers flush from the outer edge, clear of the count and the centred cube', () => {
    // The 428x926 phone portrait game board.
    const dims = { ...TEST_DIMS, boardHeight: 404, checkerSize: 27 };
    const opts = layoutOpts(dims, 28);
    const { thickness, gap } = bearOffStackLayout(opts);
    const black = tops(dims, 'black', 28);
    const steps = black.slice(1).map((top, i) => top - black[i]);

    expect([thickness, gap]).toEqual([9, 2]);
    expect(new Set(steps)).toEqual(new Set([thickness + gap]));
    expect(black[0]).toBe(BEAR_OFF_PADDING);
    expect(tops(dims, 'white', 28)[0] + thickness).toBe(opts.halfHeight - BEAR_OFF_PADDING);
    expect(black[14] + thickness + BEAR_OFF_COUNT_HEIGHT).toBeLessThanOrEqual(opts.halfHeight - BEAR_OFF_PADDING - bearOffHingeReserve(opts));
  });

  it('keeps one thickness on a tall tray and thins it only on a short one', () => {
    const tall = bearOffStackLayout(layoutOpts({ ...TEST_DIMS, boardHeight: 400 }));
    expect(bearOffStackLayout(layoutOpts({ ...TEST_DIMS, boardHeight: 500 })).thickness).toBe(tall.thickness);
    for (const boardHeight of [200, 120]) {
      const dims = { ...TEST_DIMS, boardHeight };
      const short = bearOffStackLayout(layoutOpts(dims, 20));
      expect(short.thickness).toBeLessThan(tall.thickness);
      expect(tops(dims, 'black', 20)[14] + short.thickness).toBeLessThanOrEqual(short.start + short.available + 1e-9);
    }
  });
});

it.each(['black', 'white'] as const)('lands the %s animation on the newest checker', (player) => {
  const dims = { ...TEST_DIMS, boardHeight: 360, cubeFootprint: 28 };
  const opts = layoutOpts(dims, 28);
  const { thickness } = bearOffStackLayout(opts);
  const sectionTop = player === 'black' ? 0 : opts.halfHeight + dims.middleHeight;
  expect(bearOffCheckerCenterY(dims, player, 7)).toBe(sectionTop + tops(dims, player, 28)[6] + thickness / 2);
});

describe('cube', () => {
  // 375×560 is a short phone browser: the board is small and the tray narrow.
  it.each([[260, 200], [343, 250], [358, 420], [700, 520]])('keeps a %ix%i board\'s cube clear of full stacks and bar checkers', (width, height) => {
    const base = fitBoardToViewport(width, height, { extraHeight: 36 });
    const dims = { ...base, cubeFootprint: cubeFootprint(base) };
    const half = (maxCubeEdge(dims) * 1.1) / 2;
    const piece = bearOffStackLayout(layoutOpts(dims, dims.cubeFootprint)).thickness;
    const centre = cubeCenter(dims, null);
    // Centred on the hinge: clear of White's and Black's 15-checker stacks.
    expect(centre.y + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'white', 15) - piece / 2 + 1e-6);
    expect(centre.y - half).toBeGreaterThanOrEqual(bearOffCheckerCenterY(dims, 'black', 15) + piece / 2 - 1e-6);
    expect(half * 2).toBeLessThanOrEqual(dims.bearOffWidth);
    // Owned: at its owner's end of the bar, inside the bar and clear of a full bar stack.
    for (const owner of ['black', 'white'] as const) {
      const spot = cubeCenter(dims, owner);
      expect(spot.x).toBe(6 * dims.colWidth + dims.barWidth / 2);
      expect(half * 2).toBeLessThanOrEqual(dims.barWidth);
      const { size, centers } = barStackLayout({ ...dims, count: MAX_BAR_VISIBLE, player: owner });
      const outermost = centers[centers.length - 1];
      expect(Math.abs(outermost - spot.y)).toBeGreaterThanOrEqual(size / 2 + half);
    }
  });
});
