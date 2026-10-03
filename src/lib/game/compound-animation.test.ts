import type { GameState } from './types';
import {
  createInitialPoints,
  createInitialState,
} from './constants';
import { applyMove, applyMoveSequence, findMoveSequence } from './moves';

function emptyBoard() {
  return createInitialPoints().map(() => ({ player: null as 'white' | 'black' | null, count: 0 }));
}

describe('animated compound path simulation', () => {
  it('spends the right die when a stale dieIndex is applied raw', () => {
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

    const move1 = sequence[0]!;
    const after1 = applyMove(state, move1);
    // Second move still carries its plan-time index (1), but remainingDice has
    // shrunk to [5]. Splicing index 1 consumed nothing and left the turn stuck.
    const staleSecond = { ...sequence[1]!, dieIndex: 1 };
    const afterStale = applyMove(after1, staleSecond);

    expect(afterStale.remainingDice).toEqual([]);
  });

  it('ignores an out-of-range dieIndex with no die value rather than eating a wrong die', () => {
    const state: GameState = {
      ...createInitialState('vs-human'),
      phase: 'moving',
      currentPlayer: 'white',
      dice: [2, 5],
      remainingDice: [2, 5],
      points: (() => {
        const pts = emptyBoard();
        pts[12] = { player: 'white', count: 1 };
        return pts;
      })(),
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };

    const move = { from: 12, to: 10, dieIndex: 9 };
    expect(applyMove(state, move).remainingDice).toEqual([2, 5]);
  });

  it('re-resolves die indices when applying a stored compound path', () => {
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
    const stale = sequence.map((move, index) => ({
      ...move,
      dieIndex: index === 1 ? 1 : move.dieIndex,
    }));
    const next = applyMoveSequence(state, stale);
    expect(next.remainingDice).toEqual([]);
  });
});
