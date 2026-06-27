import type { GameState } from './types';
import {
  createInitialPoints,
  createInitialState,
} from './constants';
import { applyMove, findMoveSequence } from './moves';

function emptyBoard() {
  return createInitialPoints().map(() => ({ player: null as 'white' | 'black' | null, count: 0 }));
}

describe('animated compound path simulation', () => {
  it('reproduces stuck dice when second move keeps stale dieIndex from pre-first-move state', () => {
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

    // Correct: apply step-by-step with moves as returned (engine path)
    let snap: GameState = state;
    for (const move of sequence) {
      snap = applyMove(snap, move);
    }
    expect(snap.remainingDice).toEqual([]);

    // Bug pattern: second move still has dieIndex from original [2,5] after first step
    const move1 = sequence[0];
    const after1 = applyMove(state, move1);
    const buggyMove2 = { ...sequence[1], dieIndex: 1 }; // stale index from [2,5]
    const afterBuggy = applyMove(after1, buggyMove2);

    expect(afterBuggy.remainingDice).toEqual([5]); // matches "5 still remaining"
  });
});
