/**
 * The guidance mini board uses the same fixed geometry as the main board.
 * An RTL locale must not mirror the replay.
 */
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import { StyleSheet } from 'react-native';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { BEAR_OFF, createInitialState } from '@/lib/game/constants';
import { cleanup, render } from '@/lib/test-utils';

import { AnimatedPathBoard } from './animated-path-board';

let capturedDimensions: BoardDimensions | null = null;

jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual('@/lib/i18n'),
  getIsRTL: () => true,
  getLayoutIsRTL: () => true,
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

function anchor(dimensions: BoardDimensions, pointIndex: number) {
  return getCheckerAnchor({ pointIndex, dims: dimensions, stackCount: 1, player: 'white' });
}

afterEach(cleanup);

describe('guidance mini board in an RTL locale', () => {
  it('keeps standard geometry and an LTR frame', () => {
    capturedDimensions = null;
    const { UNSAFE_root: root } = render(
      <AnimatedPathBoard
        baseState={createInitialState('vs-computer')}
        moves={[{ from: 6, to: 5, dieIndex: 0 }]}
        label="Your move"
        tone="mine"
        boardWidth={320}
      />,
    );

    const dimensions = capturedDimensions;
    expect(dimensions).not.toBeNull();
    if (!dimensions) {
      return;
    }
    expect(dimensions).not.toHaveProperty('rtl');
    // Point 6 is left of point 5; bear-off stays to the right of point 1.
    expect(anchor(dimensions, 5).x).toBeGreaterThan(anchor(dimensions, 6).x);
    expect(anchor(dimensions, BEAR_OFF).x).toBeGreaterThan(anchor(dimensions, 1).x);

    const ltrFrame = root.findAll(node =>
      StyleSheet.flatten(node.props.style)?.direction === 'ltr',
    );
    expect(ltrFrame.length).toBeGreaterThan(0);
  });
});
