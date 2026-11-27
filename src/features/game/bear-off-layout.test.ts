import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

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

function layoutOpts(dims: BoardDimensions, clearance = 0, cubeInCorner = false) {
  return {
    halfHeight: bearOffHalfHeight(dims.boardHeight, dims.middleHeight),
    tokenSize: bearOffTokenSize(dims.checkerSize),
    clearance,
    bearOffWidth: dims.bearOffWidth,
    middleHeight: dims.middleHeight,
    cubeInCorner,
  };
}

function tops(dims: BoardDimensions, player: 'black' | 'white', opts = layoutOpts(dims)) {
  return Array.from({ length: BEAR_OFF_MAX_CHECKERS }, (_, slotIndex) =>
    bearOffSlotTopInSection({ ...opts, slotIndex, player }));
}

describe('bearOffStackLayout', () => {
  it('stacks 15 evenly spaced checkers flush from the outer edge, clear of the count and the centred cube', () => {
    // The 428x926 phone portrait game board.
    const dims = { ...TEST_DIMS, boardHeight: 404, checkerSize: 27, bearOffWidth: 32 };
    const opts = layoutOpts(dims, 36);
    const { thickness, gap } = bearOffStackLayout(opts);
    const black = tops(dims, 'black', opts);
    const steps = black.slice(1).map((top, i) => top - black[i]);

    expect([thickness, gap]).toEqual([9, 2]);
    expect(new Set(steps)).toEqual(new Set([thickness + gap]));
    expect(black[0]).toBe(BEAR_OFF_PADDING);
    expect(tops(dims, 'white', opts)[0] + thickness).toBe(opts.halfHeight - BEAR_OFF_PADDING);
    expect(black[14] + thickness + BEAR_OFF_COUNT_HEIGHT).toBeLessThanOrEqual(opts.halfHeight - BEAR_OFF_PADDING - bearOffHingeReserve(opts));
  });

  it('keeps one thickness on a tall tray and thins it only on a short one', () => {
    const tall = bearOffStackLayout(layoutOpts({ ...TEST_DIMS, boardHeight: 400 }));
    expect(bearOffStackLayout(layoutOpts({ ...TEST_DIMS, boardHeight: 500 })).thickness).toBe(tall.thickness);
    for (const boardHeight of [200, 120]) {
      const dims = { ...TEST_DIMS, boardHeight };
      const short = bearOffStackLayout(layoutOpts(dims, 20));
      expect(short.thickness).toBeLessThan(tall.thickness);
      expect(tops(dims, 'black', layoutOpts(dims, 20))[14] + short.thickness).toBeLessThanOrEqual(short.start + short.available + 1e-9);
    }
  });
});

it.each(['black', 'white'] as const)('lands the %s animation on the newest checker', (player) => {
  const dims = { ...TEST_DIMS, boardHeight: 360, bearOffCubeClearance: 36, bearOffCubeCorner: player };
  const opts = layoutOpts(dims, 36, true);
  const { thickness } = bearOffStackLayout(opts);
  const sectionTop = player === 'black' ? 0 : opts.halfHeight + dims.middleHeight;
  expect(bearOffCheckerCenterY(dims, player, 7)).toBe(sectionTop + tops(dims, player, opts)[6] + thickness / 2);
});

describe('cube', () => {
  // 375×560 is a short phone browser: the board is small and the tray narrow.
  it.each([[260, 200], [343, 250], [358, 420], [428, 926], [700, 520]])('keeps a %ix%i board\'s cube clear of 15 borne-off checkers and their count', (width, height) => {
    const base = fitBoardToViewport(width, height, { extraHeight: 36 });
    const clearance = cubeCornerClearance(base.pointHeight);
    const half = (maxCubeEdge({ ...base, bearOffCubeClearance: clearance }) * 1.1) / 2;
    const halfHeight = bearOffHalfHeight(base.boardHeight, base.middleHeight);
    for (const corner of [null, 'black', 'white'] as const) {
      const dims = { ...base, bearOffCubeClearance: clearance, bearOffCubeCorner: corner };
      const y = cubeCenterY(dims, corner);
      const piece = (player: 'black' | 'white') => bearOffStackLayout(layoutOpts(dims, clearance, corner === player)).thickness;
      const whiteFar = bearOffCheckerCenterY(dims, 'white', 15) - piece('white') / 2 - BEAR_OFF_COUNT_HEIGHT;
      const blackFar = bearOffCheckerCenterY(dims, 'black', 15) + piece('black') / 2 + BEAR_OFF_COUNT_HEIGHT;
      expect(half * 2).toBeLessThanOrEqual(dims.bearOffWidth);
      if (corner === null) {
        expect(y + half).toBeLessThanOrEqual(whiteFar + 1e-6);
        expect(y - half).toBeGreaterThanOrEqual(blackFar - 1e-6);
      }
      else if (corner === 'black') {
        expect(y + half).toBeLessThanOrEqual(bearOffCheckerCenterY(dims, 'black', 1) - piece('black') / 2);
        expect(blackFar).toBeLessThanOrEqual(halfHeight);
      }
      else {
        expect(y - half).toBeGreaterThanOrEqual(bearOffCheckerCenterY(dims, 'white', 1) + piece('white') / 2);
        expect(whiteFar).toBeGreaterThanOrEqual(halfHeight + dims.middleHeight);
      }
    }
  });
});
