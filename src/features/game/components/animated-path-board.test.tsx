/**
 * The guidance mini board replays a path on its own `BoardView`, which mirrors
 * its flex rows natively in an RTL locale. It must therefore build RTL-aware
 * dimensions too, otherwise the replay checker and its dashed path arrow use
 * LTR geometry and slide backwards across the mirrored layout.
 */
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { BEAR_OFF, createInitialState } from '@/lib/game/constants';
import { cleanup, render } from '@/lib/test-utils';

import { AnimatedPathBoard } from './animated-path-board';

let capturedDimensions: BoardDimensions | null = null;

jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual('@/lib/i18n'),
  isRTL: true,
}));

jest.mock('@/features/game/components/board/board-view', () => ({
  BoardView: ({ dimensions }: { dimensions: BoardDimensions }) => {
    capturedDimensions = dimensions;
    return null;
  },
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({ preferences: { showPointNumbers: false } }),
}));

function capturePathBoardDimensions() {
  capturedDimensions = null;
  render(
    <AnimatedPathBoard
      baseState={createInitialState('vs-computer')}
      moves={[{ from: 6, to: 5, dieIndex: 0 }]}
      label="Your move"
      tone="mine"
      boardWidth={320}
    />,
  );
  return capturedDimensions as BoardDimensions | null;
}

function anchor(dimensions: BoardDimensions, pointIndex: number) {
  return getCheckerAnchor({ pointIndex, dims: dimensions, stackCount: 1, player: 'white' });
}

afterEach(cleanup);

describe('guidance mini board in RTL', () => {
  it('builds RTL-aware dimensions so the replay follows the mirrored layout', () => {
    expect(capturePathBoardDimensions()?.rtl).toBe(true);
  });

  it('animates a 6 to 5 move in the mirrored direction', () => {
    const dimensions = capturePathBoardDimensions();
    expect(dimensions).not.toBeNull();
    if (!dimensions) {
      return;
    }
    // Mirrored board: point 5 sits left of point 6, so the replay travels left.
    expect(anchor(dimensions, 5).x).toBeLessThan(anchor(dimensions, 6).x);
  });

  it('places the bear-off on the left, matching the mirrored layout', () => {
    const dimensions = capturePathBoardDimensions();
    expect(dimensions).not.toBeNull();
    if (!dimensions) {
      return;
    }
    expect(anchor(dimensions, BEAR_OFF).x).toBeLessThan(anchor(dimensions, 1).x);
  });
});
