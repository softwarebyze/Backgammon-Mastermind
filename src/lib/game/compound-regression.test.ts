import type { GameState } from './types';
import {
  createInitialPoints,
  createInitialState,
} from './constants';
import {
  applyMove,
  applyMoveSequence,
  findMoveSequence,
} from './moves';

function emptyBoard() {
  return createInitialPoints().map(() => ({ player: null as 'white' | 'black' | null, count: 0 }));
}

function captureScenario(remainingDice: [number, number]) {
  const points = emptyBoard();
  points[14] = { player: 'white', count: 1 };
  points[13] = { player: 'black', count: 1 };

  return {
    ...createInitialState('vs-human'),
    phase: 'moving' as const,
    currentPlayer: 'white' as const,
    dice: remainingDice,
    remainingDice: [...remainingDice],
    points,
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  };
}

describe('compound move regressions (user-reported)', () => {
  it('captures on 1+4 compound when remainingDice is [1,4]', () => {
    const state = captureScenario([1, 4]);
    const sequence = findMoveSequence(state, 14, 9)!;
    const next = applyMoveSequence(state, sequence);
    expect(next.bar.black).toBe(1);
    expect(next.remainingDice).toEqual([]);
  });

  it('captures on 1+4 compound when remainingDice is [4,1] (user report: misses capture)', () => {
    const state = captureScenario([4, 1]);
    const sequence = findMoveSequence(state, 14, 9)!;
    const next = applyMoveSequence(state, sequence);
    expect(next.bar.black).toBe(1);
    expect(next.remainingDice).toEqual([]);
  });

  it('consumes both dice for a 2+5 compound tap (7 pips)', () => {
    const points = emptyBoard();
    points[12] = { player: 'white', count: 1 };

    const state: GameState = {
      ...createInitialState('vs-human'),
      phase: 'moving',
      currentPlayer: 'white',
      dice: [2, 5],
      remainingDice: [2, 5],
      points,
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };

    const sequence = findMoveSequence(state, 12, 5)!;
    expect(sequence).toHaveLength(2);

    let snap: GameState = state;
    for (const move of sequence) {
      expect(move.dieIndex).toBeLessThan(snap.remainingDice.length);
      snap = applyMove(snap, move);
    }
    expect(snap.remainingDice).toEqual([]);
  });

  it('after 3 singles on double 1s, one die remains (engine — leave/resume is separate)', () => {
    const points = emptyBoard();
    points[24] = { player: 'white', count: 1 };
    points[23] = { player: 'white', count: 1 };
    points[22] = { player: 'white', count: 1 };

    let state: GameState = {
      ...createInitialState('vs-human'),
      phase: 'moving' as const,
      currentPlayer: 'white' as const,
      dice: [1, 1],
      remainingDice: [1, 1, 1, 1],
      points,
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };

    for (let i = 0; i < 3; i++) {
      const move = findMoveSequence(state, 24 - i, 23 - i)!;
      state = applyMove(state, move[0]);
    }

    expect(state.remainingDice).toEqual([1]);
    expect(state.currentPlayer).toBe('white');
  });
});
