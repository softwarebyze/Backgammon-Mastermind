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
  it('documents stale dieIndex bug when applying raw moves without re-resolution', () => {
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
    const buggyMove2 = { ...sequence[1]!, dieIndex: 1 };
    const afterBuggy = applyMove(after1, buggyMove2);

    expect(afterBuggy.remainingDice).toEqual([5]);
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
