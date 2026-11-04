import type { GameState } from '@/lib/game';
import { resolveBoardTap } from '@/features/game/resolve-board-tap';
import { createInitialState } from '@/lib/game';
import { BEAR_OFF } from '@/lib/game/constants';

function movingState(dice: [number, number] = [3, 5]): GameState {
  return {
    ...createInitialState('vs-human'),
    phase: 'moving',
    currentPlayer: 'white',
    dice,
    remainingDice: [...dice],
  };
}

describe('resolveBoardTap', () => {
  it('plays a single legal destination from the current selection', () => {
    expect(resolveBoardTap(movingState(), 8, 5)).toEqual({
      type: 'play',
      sequence: [{ from: 8, to: 5, dieIndex: expect.any(Number), die: 3 }],
    });
  });

  it('plays a compound destination from the current selection', () => {
    const state = movingState([3, 2]);
    const result = resolveBoardTap(state, 13, 8);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.sequence.map(m => [m.from, m.to])).toEqual([[13, 10], [10, 8]]);
    }
  });

  it('selects a checker with more than one destination', () => {
    expect(resolveBoardTap(movingState(), null, 13)).toEqual({ type: 'select', point: 13 });
  });

  it('auto-plays a checker with exactly one destination', () => {
    expect(resolveBoardTap(movingState(), null, 6)).toEqual({
      type: 'play',
      sequence: [{ from: 6, to: 3, dieIndex: expect.any(Number), die: 3 }],
    });
  });

  it('clears when the selected point is tapped again', () => {
    expect(resolveBoardTap(movingState(), 8, 8)).toEqual({ type: 'clear' });
  });

  it('switches selection when another own checker is tapped', () => {
    expect(resolveBoardTap(movingState(), 24, 13)).toEqual({ type: 'select', point: 13 });
  });

  it('clears on an empty or opponent point', () => {
    expect(resolveBoardTap(movingState(), null, 4)).toEqual({ type: 'clear' });
  });

  it('does not select a normal checker while the bar must be entered first', () => {
    const state: GameState = {
      ...movingState([1, 2]),
      bar: { white: 1, black: 0 },
    };
    expect(resolveBoardTap(state, null, 13)).toEqual({ type: 'noop' });
    expect(resolveBoardTap(state, null, 0)).toEqual({ type: 'select', point: 0 });
  });

  it('plays bear-off via the destination path', () => {
    const state: GameState = {
      ...movingState([3, 5]),
      points: createInitialState('vs-human').points.map((p, i) => (
        i === 4 ? { player: 'white' as const, count: 1 } : { player: null, count: 0 }
      )),
    };
    const result = resolveBoardTap(state, 4, BEAR_OFF);
    expect(result.type).toBe('play');
  });

  it('nudges before the dice are rolled', () => {
    expect(resolveBoardTap(createInitialState('vs-human'), null, 13)).toEqual({ type: 'nudge' });
  });
});
