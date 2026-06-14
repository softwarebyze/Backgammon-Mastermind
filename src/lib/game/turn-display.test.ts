import { createInitialState } from '@/lib/game/constants';
import { getActionCaption, getTurnDisplay } from '@/lib/game/turn-display';

describe('turn-display', () => {
  it('labels vs-computer human turn with white checker context', () => {
    const state = createInitialState('vs-computer');
    const turn = getTurnDisplay(state);
    expect(turn.colorLabel).toBe('White');
    expect(turn.headline).toBe('Your turn');
    expect(turn.isHumanTurn).toBe(true);
    expect(getActionCaption(state, turn)).toMatch(/WHITE/);
  });

  it('labels computer turn as black waiting state', () => {
    const state = createInitialState('vs-computer');
    state.currentPlayer = 'black';
    const turn = getTurnDisplay(state);
    expect(turn.colorLabel).toBe('Black');
    expect(turn.headline).toBe('Computer\'s turn');
    expect(turn.isWaiting).toBe(true);
    expect(getActionCaption(state, turn)).toBe('Black is rolling…');
  });

  it('labels local two-player black turn', () => {
    const state = createInitialState('vs-human');
    state.currentPlayer = 'black';
    const turn = getTurnDisplay(state);
    expect(turn.headline).toBe('Black\'s turn');
    expect(turn.isHumanTurn).toBe(true);
  });
});
