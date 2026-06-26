import { createInitialState } from '@/lib/game/constants';
import { applyDiceRoll } from '@/lib/game/moves';
import { getActionCaption, getTurnDisplay } from '@/lib/game/turn-display';

describe('turn-display', () => {
  it('labels vs-computer human turn with white checker context', () => {
    const state = createInitialState('vs-computer');
    const turn = getTurnDisplay(state);
    expect(turn.colorLabel).toBe('White');
    expect(turn.headline).toBe('Your turn');
    expect(turn.isHumanTurn).toBe(true);
    expect(getActionCaption(state, turn)).toMatch(/Roll for opening/);
  });

  it('labels computer turn as black waiting state', () => {
    const state = createInitialState('vs-computer');
    state.phase = 'rolling';
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

  it('marks game-over as waiting with game over headline', () => {
    const state = createInitialState('vs-computer');
    state.phase = 'game-over';
    state.winner = 'white';
    const turn = getTurnDisplay(state);
    expect(turn.headline).toBe('Game over');
    expect(turn.isWaiting).toBe(true);
    expect(turn.isHumanTurn).toBe(false);
  });

  it('prompts to cancel when a checker is selected (TestFlight #6)', () => {
    let state = createInitialState('vs-computer');
    state = applyDiceRoll(state, [3, 2]);
    state.selectedPoint = 1;
    const turn = getTurnDisplay(state);
    expect(getActionCaption(state, turn)).toBe(
      'Selected — tap a highlight or tap the board to cancel',
    );
  });

  it('prompts to enter from the bar first (TestFlight #8)', () => {
    let state = createInitialState('vs-computer');
    state = applyDiceRoll(state, [4, 1]);
    state.bar.white = 1;
    const turn = getTurnDisplay(state);
    expect(getActionCaption(state, turn)).toBe(
      'Enter from the bar before moving other checkers',
    );
  });

  it('prompts to move checkers when none are selected', () => {
    let state = createInitialState('vs-computer');
    state = applyDiceRoll(state, [3, 2]);
    state.selectedPoint = null;
    const turn = getTurnDisplay(state);
    expect(getActionCaption(state, turn)).toBe('Move your white checkers');
  });

  it('explains blocked bar entry with rolled dice visible (#43)', () => {
    const state = createInitialState('vs-computer');
    state.bar.white = 1;
    state.points[24].count = 1;
    state.points[13].count = 0;
    const blocked = applyDiceRoll(state, [6, 6]);
    const turn = getTurnDisplay(blocked);
    expect(blocked.phase).toBe('no-move');
    expect(blocked.dice).toEqual([6, 6]);
    expect(getActionCaption(blocked, turn)).toBe(
      'Can\'t enter from the bar with 6 and 6 — end your turn',
    );
  });
});
