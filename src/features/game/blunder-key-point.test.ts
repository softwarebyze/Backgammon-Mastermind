import type { Move } from '@/lib/game/types';

import { blunderKeyPoint } from '@/features/game/blunder-key-point';
import { createInitialState } from '@/lib/game/constants';

function moving() {
  return {
    ...createInitialState('vs-computer'),
    phase: 'moving' as const,
    dice: [6, 5] as [number, number],
    remainingDice: [6, 5],
  };
}

const hit = (from: number, to: number, die: number): Move => ({ from, to, die, dieIndex: 0 });

describe('blunderKeyPoint', () => {
  it('falls back to the rank sentence when the two plays leave the same shape', () => {
    const text = blunderKeyPoint({
      questionState: moving(),
      myMoves: [],
      engineMoves: [],
      playedRank: 4,
      candidateCount: 12,
    });
    expect(text).toBe('Your move ranked 4 of 12 ways to play this roll.');
  });

  it('says when the played move gives up a point the best move keeps', () => {
    const state = moving();
    const text = blunderKeyPoint({
      questionState: state,
      // 24-point starts with two checkers; stepping one off breaks it.
      myMoves: [hit(24, 18, 6)],
      engineMoves: [hit(13, 7, 6)],
      playedRank: 3,
      candidateCount: 8,
    });
    expect(text).toContain('24-point');
    expect(text).toContain('gives up');
  });

  it('says when the best move hits and the played move does not', () => {
    const state = moving();
    state.points[18] = { player: 'black', count: 1 };
    const text = blunderKeyPoint({
      questionState: state,
      myMoves: [hit(13, 7, 6)],
      engineMoves: [hit(24, 18, 6)],
      playedRank: 2,
      candidateCount: 6,
    });
    expect(text).toContain('hits a blot');
  });
});
