import { BEAR_OFF } from '@/lib/game/constants';
import { createPositionState } from '@/lib/game/create-position';
import { applyMove } from '@/lib/game/moves';

import {
  resolveAcceptedMove,
  validateIdentify,
  validateTryMove,
} from './validate-step';

describe('validateIdentify', () => {
  it('accepts any listed point', () => {
    expect(validateIdentify([1, 2, 3, 4, 5, 6], 4)).toEqual({ status: 'correct' });
    expect(validateIdentify([0], 0)).toEqual({ status: 'correct' });
  });

  it('rejects other points', () => {
    expect(validateIdentify([1, 2, 3, 4, 5, 6], 13)).toEqual({ status: 'illegal' });
  });
});

describe('validateTryMove', () => {
  it('marks the curriculum move as correct', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 5, player: 'black', count: 1 },
      ],
      dice: [3, 1],
    });

    expect(
      validateTryMove({ state, accepted: [{ from: 8, to: 5 }], from: 8, to: 5 }),
    ).toEqual({ status: 'correct' });
  });

  it('soft-fails on a legal but unaccepted move', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 6, player: 'white', count: 1 },
      ],
      dice: [3, 1],
    });

    // 6→5 with the 1 is legal; curriculum wants 8→5 first for this assertion.
    expect(
      validateTryMove({ state, accepted: [{ from: 8, to: 5 }], from: 6, to: 5 }),
    ).toEqual({ status: 'legalButWrong' });
  });

  it('rejects illegal landings', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 5, player: 'black', count: 2 },
      ],
      dice: [3, 1],
    });

    expect(
      validateTryMove({ state, accepted: [{ from: 8, to: 7 }], from: 8, to: 5 }),
    ).toEqual({ status: 'illegal' });
  });

  it('accepts a bar entry move', () => {
    const state = createPositionState({
      bar: { white: 1 },
      dice: [4, 2],
    });

    expect(
      validateTryMove({ state, accepted: [{ from: 0, to: 21 }], from: 0, to: 21 }),
    ).toEqual({ status: 'correct' });
  });

  it('accepts bearing off', () => {
    const state = createPositionState({
      placements: [{ point: 3, player: 'white', count: 1 }],
      borneOff: { white: 14 },
      dice: [3, 1],
    });

    expect(
      validateTryMove({
        state,
        accepted: [{ from: 3, to: BEAR_OFF }],
        from: 3,
        to: BEAR_OFF,
      }),
    ).toEqual({ status: 'correct' });
  });
});

describe('resolveAcceptedMove', () => {
  it('returns a legal Move that applyMove can consume', () => {
    let state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 1 }],
      dice: [3, 1],
    });
    const move = resolveAcceptedMove(state, 8, 5);
    expect(move).toMatchObject({ from: 8, to: 5 });
    state = applyMove(state, move!);
    expect(state.points[5]).toEqual({ player: 'white', count: 1 });
  });
});
