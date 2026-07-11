import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { getCheckerAnchor, POINT_NUMBER_RAIL, pointIndexFromColumn, resolveDropTarget } from '@/features/game/board-point-layout';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

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

describe('getCheckerAnchor', () => {
  it('places the bottom point anchor at the top checker center', () => {
    const stackCount = 3;
    const step = Math.min(
      TEST_DIMS.checkerSize - 2,
      (TEST_DIMS.pointHeight - TEST_DIMS.checkerSize) / 4,
    );
    const topOffset = stackCount - 1;
    const expectedY
      = TEST_DIMS.pointHeight
        + TEST_DIMS.middleHeight
        + TEST_DIMS.pointHeight
        - TEST_DIMS.checkerSize / 2
        - topOffset * step;

    const anchor = getCheckerAnchor({
      pointIndex: 6,
      dims: TEST_DIMS,
      stackCount,
      player: 'white',
    });

    expect(anchor.y).toBeCloseTo(expectedY);
    expect(anchor.x).toBeGreaterThan(0);
  });

  it('offsets bar stacks by checker index', () => {
    const first = getCheckerAnchor({
      pointIndex: 0,
      dims: TEST_DIMS,
      stackCount: 1,
      player: 'white',
    });
    const second = getCheckerAnchor({
      pointIndex: 0,
      dims: TEST_DIMS,
      stackCount: 2,
      player: 'white',
    });

    expect(second.y).toBeLessThan(first.y);
  });
});

describe('point number rail', () => {
  it('reserves enough height for labels outside the playing surface', () => {
    expect(POINT_NUMBER_RAIL).toBeGreaterThanOrEqual(16);
  });
});

describe('point index from column / resolve drop target', () => {
  it('round-trips column mapping for corners', () => {
    expect(pointIndexFromColumn(0, true)).toBe(13);
    expect(pointIndexFromColumn(5, true)).toBe(18);
    expect(pointIndexFromColumn(6, true)).toBe(19);
    expect(pointIndexFromColumn(11, true)).toBe(24);
    expect(pointIndexFromColumn(0, false)).toBe(12);
    expect(pointIndexFromColumn(5, false)).toBe(7);
    expect(pointIndexFromColumn(6, false)).toBe(6);
    expect(pointIndexFromColumn(11, false)).toBe(1);
  });

  it('resolves point centers from anchors', () => {
    for (const point of [1, 6, 12, 13, 19, 24]) {
      const anchor = getCheckerAnchor({ pointIndex: point, dims: TEST_DIMS, stackCount: 1 });
      expect(resolveDropTarget(anchor.x, anchor.y, TEST_DIMS)).toBe(point);
    }
  });

  it('resolves bar and bear-off', () => {
    const barX = 6 * TEST_DIMS.colWidth + TEST_DIMS.barWidth / 2;
    expect(resolveDropTarget(barX, TEST_DIMS.boardHeight / 2, TEST_DIMS)).toBe(BAR_POINT);

    const bearX = 12 * TEST_DIMS.colWidth + TEST_DIMS.barWidth + TEST_DIMS.bearOffWidth / 2;
    expect(resolveDropTarget(bearX, TEST_DIMS.pointHeight / 2, TEST_DIMS)).toBe(BEAR_OFF);
  });

  it('returns null for middle groove and OOB', () => {
    const midY = TEST_DIMS.pointHeight + TEST_DIMS.middleHeight / 2;
    expect(resolveDropTarget(TEST_DIMS.colWidth / 2, midY, TEST_DIMS)).toBeNull();
    expect(resolveDropTarget(-1, 10, TEST_DIMS)).toBeNull();
    expect(resolveDropTarget(10, -1, TEST_DIMS)).toBeNull();
  });
});
