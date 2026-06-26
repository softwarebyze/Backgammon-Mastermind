import { createInitialState } from './constants';
import { applyDiceRoll } from './moves';
import { getForcedLegalMove, hasExactlyOneLegalMove } from './single-move';

describe('single-move helpers', () => {
  it('returns false when multiple legal moves exist', () => {
    let state = createInitialState('vs-computer');
    state = applyDiceRoll(state, [3, 5]);
    expect(hasExactlyOneLegalMove(state)).toBe(false);
    expect(getForcedLegalMove(state)).toBeNull();
  });

  it('returns false in no-move phase', () => {
    const state = createInitialState('vs-computer');
    state.phase = 'no-move';
    expect(hasExactlyOneLegalMove(state)).toBe(false);
  });

  it('returns false in rolling phase', () => {
    const state = createInitialState('vs-computer');
    expect(hasExactlyOneLegalMove(state)).toBe(false);
  });
});
