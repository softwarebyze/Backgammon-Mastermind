import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import { getCheckerAnchor } from '@/features/game/board-point-layout';

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
