import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { movePathAnchors } from '@/features/game/components/board/move-path-anchors';
import { clampPathAnchor } from '@/features/game/components/board/move-path-bounds';
import { formatReviewPositionLabel } from '@/features/game/review-helpers';
import { BAR_POINT, createInitialState } from '@/lib/game/constants';
import { applyMove, getLegalMoves } from '@/lib/game/moves';

function mockDims(): BoardDimensions {
  return {
    boardWidth: 360,
    boardHeight: 400,
    boardOuterWidth: 376,
    boardOuterHeight: 416,
    boardFrameWidth: 8,
    colWidth: 24,
    pointHeight: 160,
    middleHeight: 40,
    barWidth: 28,
    bearOffWidth: 32,
    checkerSize: 28,
  };
}

describe('move-path-overlay', () => {
  it('anchors path from top of source stack to landing stack', () => {
    const before = {
      ...createInitialState('vs-human'),
      phase: 'moving' as const,
      currentPlayer: 'white' as const,
      dice: [4, 2] as [number, number],
      remainingDice: [4, 2],
    };
    const move = getLegalMoves(before).find(m => m.from === 8)!;
    const dims = mockDims();
    const entry = {
      ply: 1,
      player: 'white' as const,
      dice: before.dice,
      from: move.from,
      to: move.to,
    };

    const { from, to } = movePathAnchors(entry, before, dims);
    const shallowFrom = getCheckerAnchor({
      pointIndex: move.from,
      dims,
      stackCount: 1,
      player: 'white',
    });

    expect(from.y).not.toEqual(shallowFrom.y);
    expect(to.x).toBeGreaterThan(0);
    expect(applyMove(before, move).points[move.to].count).toBeGreaterThan(0);
  });

  it('clamps bar anchors inside the board overlay', () => {
    const dims = mockDims();
    const before = {
      ...createInitialState('vs-human'),
      phase: 'moving' as const,
      currentPlayer: 'white' as const,
      dice: [4, 2] as [number, number],
      remainingDice: [4, 2],
      bar: { white: 1, black: 0 },
    };
    const raw = getCheckerAnchor({
      pointIndex: BAR_POINT,
      dims,
      stackCount: 1,
      player: 'white',
    });
    expect(raw.y).toBeGreaterThanOrEqual(dims.boardHeight - 20);

    const entry = {
      ply: 1,
      player: 'white' as const,
      dice: before.dice,
      from: BAR_POINT,
      to: 4,
    };
    const { from } = movePathAnchors(entry, before, dims);
    expect(from.y).toBeLessThanOrEqual(dims.boardHeight - 4);
    expect(from.y).toBeGreaterThanOrEqual(4);
    expect(from.y).toBeLessThanOrEqual(clampPathAnchor(raw, dims).y + 0.01);
  });
});

describe('formatReviewPositionLabel', () => {
  it('labels opening and move positions', () => {
    expect(formatReviewPositionLabel(0, 3, [])).toContain('Opening');
    expect(formatReviewPositionLabel(2, 5, [{
      ply: 1,
      player: 'white',
      dice: [3, 5],
      from: 8,
      to: 3,
    }, {
      ply: 2,
      player: 'white',
      dice: [3, 5],
      from: 6,
      to: 1,
    }])).toContain('2');
  });
});
