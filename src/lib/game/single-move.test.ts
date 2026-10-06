import { BEAR_OFF, createInitialState } from './constants';
import { createPositionState } from './create-position';
import { applyDiceRoll, getLegalMoves } from './moves';
import {
  getForcedLegalMove,
  getForcedTurnSequence,
  getSingleDestinationSequence,
  hasExactlyOneLegalMove,
} from './single-move';

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

  it('returns null when bear-off order is a real choice (6→3 vs bear both)', () => {
    // White on 6 and 3 with 6·3 can bear both OR play 6→3 then bear — not forced.
    let state = createInitialState('vs-human');
    state = {
      ...state,
      points: state.points.map(() => ({ player: null, count: 0 })),
      bar: { white: 0, black: 0 },
      borneOff: { white: 13, black: 0 },
      phase: 'moving',
      currentPlayer: 'white',
      dice: [6, 3],
      remainingDice: [6, 3],
    };
    state.points[6] = { player: 'white', count: 1 };
    state.points[3] = { player: 'white', count: 1 };

    expect(getForcedLegalMove(state)).toBeNull();
    expect(getForcedTurnSequence(state)).toBeNull();
  });

  it('forces commuting bear-offs when the only plays share one outcome', () => {
    // White on 5 and 2, dice 5·2; black points block 5→3 so order is the only choice.
    let state = createInitialState('vs-human');
    state = {
      ...state,
      points: state.points.map(() => ({ player: null, count: 0 })),
      bar: { white: 0, black: 0 },
      borneOff: { white: 13, black: 0 },
      phase: 'moving',
      currentPlayer: 'white',
      dice: [5, 2],
      remainingDice: [5, 2],
    };
    state.points[5] = { player: 'white', count: 1 };
    state.points[2] = { player: 'white', count: 1 };
    state.points[3] = { player: 'black', count: 2 };
    state.points[4] = { player: 'black', count: 2 };

    expect(getForcedLegalMove(state)).toBeNull();
    const sequence = getForcedTurnSequence(state);
    expect(sequence).toHaveLength(2);
    expect(sequence!.every(m => m.to === BEAR_OFF)).toBe(true);
  });

  it('one-taps a checker that has only one reachable destination', () => {
    let state = createInitialState('vs-computer');
    state = {
      ...state,
      points: state.points.map(() => ({ player: null, count: 0 })),
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
      phase: 'moving',
      currentPlayer: 'white',
      dice: [3, 5],
      remainingDice: [3],
    };
    state.points[8] = { player: 'white', count: 1 };

    const sequence = getSingleDestinationSequence(state, 8);
    expect(sequence).toHaveLength(1);
    expect(sequence![0]).toMatchObject({ from: 8, to: 5 });
    expect(getSingleDestinationSequence(state, 6)).toBeNull();
  });

  it('does not one-tap when the same checker can land on more than one point', () => {
    let state = createInitialState('vs-human');
    state = {
      ...state,
      phase: 'moving',
      currentPlayer: 'white',
      dice: [1, 2],
      remainingDice: [1, 2],
      points: state.points.map((p, i) =>
        i === 10 ? { player: 'white', count: 1 } : { player: null, count: 0 },
      ),
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };

    expect(getSingleDestinationSequence(state, 10)).toBeNull();
  });
});

describe('last checker on the 1 point', () => {
  const rolls: Array<[number, number]> = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      rolls.push([a, b]);
    }
  }

  function lastCheckerState(player: 'white' | 'black', dice: [number, number]) {
    return createPositionState({
      placements: [{ point: player === 'white' ? 1 : 24, player, count: 1 }],
      borneOff: { [player]: 14 },
      currentPlayer: player,
      dice,
    });
  }

  it.each(rolls)('is forced for white on %i-%i, including high rolls', (a, b) => {
    const state = lastCheckerState('white', [a, b]);
    expect(state.phase).toBe('moving');
    expect(getForcedLegalMove(state)).toMatchObject({ from: 1, to: BEAR_OFF });
  });

  it.each(rolls)('is forced for black on %i-%i, including high rolls', (a, b) => {
    const state = lastCheckerState('black', [a, b]);
    expect(state.phase).toBe('moving');
    expect(getForcedLegalMove(state)).toMatchObject({ from: 24, to: BEAR_OFF });
  });

  it('spends the higher die first so a 6-5 is one legal move, not two', () => {
    const state = lastCheckerState('white', [5, 6]);
    expect(getLegalMoves(state)).toHaveLength(1);
    expect(getLegalMoves(state)[0]).toMatchObject({ die: 6 });
  });

  it('forces the whole turn when a second checker shares the 1 point outcome', () => {
    const state = lastCheckerState('white', [6, 5]);
    state.points[2] = { player: 'white', count: 1 };
    state.borneOff.white = 13;
    expect(getForcedLegalMove(state)).toBeNull();
    const sequence = getForcedTurnSequence(state);
    expect(sequence).toHaveLength(2);
    expect(sequence!.every(m => m.to === BEAR_OFF)).toBe(true);
  });
});
