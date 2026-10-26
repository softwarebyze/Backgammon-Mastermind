import type { Move } from '@/lib/game';
import { resolveSequenceSteps, runMoveSequence } from '@/features/game/animated-move-sequence';
import { applyMove, createPositionState } from '@/lib/game';

function position() {
  return createPositionState({ dice: [4, 6], placements: [
    { point: 4, player: 'white', count: 2 },
    { point: 2, player: 'white', count: 13 },
    { point: 19, player: 'black', count: 15 },
  ] });
}

it.each([false, true])('preserves the selected first bear-off and resolves shifted indices, explicit=%s', (explicit) => {
  const moves: Move[] = [
    { from: 4, to: 25, dieIndex: 1, ...(explicit ? { die: 6 } : {}) },
    { from: 4, to: 25, dieIndex: 0, ...(explicit ? { die: 4 } : {}) },
  ];
  const steps = resolveSequenceSteps(position(), moves);
  expect(steps?.map(step => step.legal.die)).toEqual([6, 4]);
  expect(steps?.[0]?.after.remainingDice).toEqual([4]);
});

it('supports index-only stored sequences after the original second index shifts', () => {
  const steps = resolveSequenceSteps(position(), [
    { from: 4, to: 25, dieIndex: 0 },
    { from: 4, to: 25, dieIndex: 1 },
  ]);
  expect(steps?.map(step => [step.legal.die, step.legal.dieIndex])).toEqual([[4, 0], [6, 0]]);
});

it('does not replace an explicitly spent die with the remaining legal die', () => {
  expect(resolveSequenceSteps(position(), [
    { from: 4, to: 25, dieIndex: 1, die: 6 },
    { from: 4, to: 25, dieIndex: 0, die: 6 },
  ])).toBeNull();
});

it.each([false, true])('preserves explicit die values in serialized animation callbacks after indices shift, swapped=%s', (swapped) => {
  const played: Move[] = [];
  runMoveSequence(position(), [
    { from: 4, to: 25, dieIndex: swapped ? 1 : 0, die: swapped ? 6 : 4 },
    { from: 4, to: 25, dieIndex: swapped ? 0 : 1, die: swapped ? 4 : 6 },
  ], {
    isAnimating: false,
    playMove: (snap, move, opts) => {
      played.push(move);
      opts?.onComplete?.(applyMove(snap, move));
    },
    setState: jest.fn(),
    setMoveAnimation: jest.fn(),
    setSequenceActive: jest.fn(),
    isCommitLive: () => true,
  });
  expect(played.map(move => [move.die, move.dieIndex])).toEqual(swapped ? [[6, 1], [4, 0]] : [[4, 0], [6, 0]]);
});
