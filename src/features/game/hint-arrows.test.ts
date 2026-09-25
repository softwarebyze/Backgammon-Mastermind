import type { GameState } from '@/lib/game/types';
import { createPositionState } from '@/lib/game/create-position';

import { hintMovesToSegments } from './hint-arrows';

/** White to move with 3-1 from a midgame-ish position. */
function movingState(): GameState {
  return createPositionState({
    currentPlayer: 'white',
    mode: 'vs-computer',
    dice: [3, 1],
    placements: [
      { point: 24, player: 'white', count: 2 },
      { point: 13, player: 'white', count: 5 },
      { point: 8, player: 'white', count: 3 },
      { point: 6, player: 'white', count: 5 },
      { point: 1, player: 'black', count: 2 },
      { point: 12, player: 'black', count: 5 },
      { point: 17, player: 'black', count: 3 },
      { point: 19, player: 'black', count: 5 },
    ],
  });
}

describe('hintMovesToSegments', () => {
  it('converts a hint sequence into board arrow segments', () => {
    const state = movingState();
    const segments = hintMovesToSegments(
      [
        { from: 13, to: 10, dieIndex: 0 },
        { from: 8, to: 7, dieIndex: 1 },
      ],
      state,
    );

    expect(segments).toHaveLength(2);
    expect(segments[0].entry.from).toBe(13);
    expect(segments[0].entry.to).toBe(10);
    expect(segments[0].entry.player).toBe('white');
    expect(segments[0].beforeState).toBe(state);
    // The second arrow starts from the position after the first move.
    expect(segments[1].beforeState.points[13].count).toBe(4);
    expect(segments[1].beforeState.points[10].count).toBe(1);
    expect(segments[1].beforeState.points[10].player).toBe('white');
    expect(segments[1].entry.from).toBe(8);
    expect(segments[1].entry.to).toBe(7);
  });

  it('stops at the first hint move that is not legal', () => {
    const state = movingState();
    const segments = hintMovesToSegments(
      [
        { from: 13, to: 10, dieIndex: 0 },
        { from: 1, to: 2, dieIndex: 1 }, // white owns no checker on point 1
      ],
      state,
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].entry.to).toBe(10);
  });

  it('returns no segments for an empty hint', () => {
    expect(hintMovesToSegments([], movingState())).toHaveLength(0);
  });
});
