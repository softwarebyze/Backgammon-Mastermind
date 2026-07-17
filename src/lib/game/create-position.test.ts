import { createInitialPoints } from './constants';
import { createEmptyPoints, createPositionState } from './create-position';

describe('createEmptyPoints', () => {
  it('returns 25 empty slots (index 0 unused)', () => {
    const points = createEmptyPoints();
    expect(points).toHaveLength(25);
    expect(points.every(point => point.player === null && point.count === 0)).toBe(true);
  });
});

describe('createPositionState', () => {
  it('builds an empty rolling position by default', () => {
    const state = createPositionState();
    expect(state.phase).toBe('rolling');
    expect(state.currentPlayer).toBe('white');
    expect(state.bar).toEqual({ white: 0, black: 0 });
    expect(state.points[24].count).toBe(0);
  });

  it('applies placements and locked dice into the moving phase', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 6, player: 'white', count: 1 },
      ],
      dice: [3, 1],
    });

    expect(state.phase).toBe('moving');
    expect(state.dice).toEqual([3, 1]);
    expect(state.remainingDice).toEqual([3, 1]);
    expect(state.points[8]).toEqual({ player: 'white', count: 1 });
    expect(state.points[6]).toEqual({ player: 'white', count: 1 });
  });

  it('can start from the standard setup', () => {
    const state = createPositionState({ useStandardSetup: true });
    expect(state.points).toEqual(createInitialPoints());
  });

  it('grants four remaining dice on doubles', () => {
    const state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 2 }],
      dice: [2, 2],
    });
    expect(state.remainingDice).toEqual([2, 2, 2, 2]);
  });
});
