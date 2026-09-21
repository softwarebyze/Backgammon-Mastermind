import { createInitialState } from '@/lib/game/constants';
import { applyOpeningDieRoll } from '@/lib/game/moves';
import { openingCopy, openingJustResolved, openingTray } from '@/lib/game/opening-display';

describe('opening display', () => {
  it('shows two empty slots and asks who goes first before anyone rolls', () => {
    const state = createInitialState('vs-computer');
    expect(openingTray(state, null)).toEqual({ dice: [0, 0], emphasis: null });
    expect(openingCopy(state, null)).toEqual({
      headline: 'Who goes first?',
      caption: 'White rolls for opening',
    });
  });

  it('fills the white slot after white rolls and says the computer is rolling', () => {
    const state = applyOpeningDieRoll(createInitialState('vs-computer'), 4);
    expect(openingTray(state, null)).toEqual({ dice: [4, 0], emphasis: null });
    expect(openingCopy(state, null)?.caption).toBe('Black is rolling…');
  });

  it('asks the second human to roll in pass-and-play', () => {
    const state = applyOpeningDieRoll(createInitialState('vs-human'), 4);
    expect(openingCopy(state, null)?.caption).toBe('Black rolls for opening');
  });

  it('detects the resolved opening and emphasizes the winner', () => {
    const afterWhite = applyOpeningDieRoll(createInitialState('vs-computer'), 2);
    const resolved = applyOpeningDieRoll(afterWhite, 5);
    const reveal = openingJustResolved(afterWhite, resolved);
    expect(reveal).toEqual({ white: 2, black: 5, winner: 'black' });
    expect(openingTray(resolved, reveal)).toEqual({ dice: [2, 5], emphasis: 1 });
    expect(openingCopy(resolved, reveal)).toEqual({
      headline: 'Black goes first!',
      caption: 'Black 5 beats 2',
    });
    // Once the reveal is over, normal play owns tray and copy.
    expect(openingTray(resolved, null)).toBeNull();
    expect(openingCopy(resolved, null)).toBeNull();
  });

  it('shows the tie with both dice and no winner', () => {
    const afterWhite = applyOpeningDieRoll(createInitialState('vs-computer'), 3);
    const tied = applyOpeningDieRoll(afterWhite, 3);
    expect(openingJustResolved(afterWhite, tied)).toBeNull();
    expect(openingTray(tied, null)).toEqual({ dice: [3, 3], emphasis: null });
    expect(openingCopy(tied, null)?.headline).toBe('Tie!');
  });

  it('does not treat a normal roll as an opening resolution', () => {
    const state = createInitialState('vs-computer');
    state.phase = 'rolling';
    const next = { ...state, phase: 'moving' as const, dice: [6, 4] as [number, number] };
    expect(openingJustResolved(state, next)).toBeNull();
  });
});
