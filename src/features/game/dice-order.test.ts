import { applyMove, createInitialState, createPositionState } from '@/lib/game';
import { diceOrderMove, leadingUnspentDie, orderedDice } from './dice-order';

it('spends exactly the displayed leading die, then skips the spent slot', () => {
  const state = { ...createInitialState('vs-human'), phase: 'moving' as const, dice: [3, 1] as [number, number], remainingDice: [3, 1] };
  expect(orderedDice(state.dice, true)).toEqual([1, 3]);
  expect(diceOrderMove(state, 8, true)).toMatchObject({ from: 8, to: 7, die: 1 });
  const next = applyMove(state, diceOrderMove(state, 8, true)!);
  expect(next.remainingDice).toEqual([3]);
  expect(leadingUnspentDie(next, true)).toBe(3);
  expect(diceOrderMove(next, 8, true)).toMatchObject({ to: 5, die: 3 });
});

it.each([false, true])('keeps bar priority with reversed=%s', (reversed) => {
  const state = { ...createInitialState('vs-human'), phase: 'moving' as const, dice: [3, 1] as [number, number], remainingDice: [3, 1], bar: { white: 1, black: 0 } };
  expect(diceOrderMove(state, 6, reversed)).toBeNull();
  expect(diceOrderMove(state, 0, reversed)).toMatchObject({ from: 0, die: reversed ? 1 : 3 });
});

it.each([false, true])('requires a swap when the leading lower die violates max-use/higher-die (higher-only=%s)', (higherOnly) => {
  const state = createPositionState({ placements: [
    { point: 6, player: 'white', count: 14 },
    { point: 22, player: 'black', count: 2 },
    { point: 4, player: 'black', count: 2 },
    ...(higherOnly ? [{ point: 5, player: 'black' as const, count: 2 }] : []),
    { point: 19, player: 'black', count: higherOnly ? 9 : 11 },
  ], bar: { white: 1 }, dice: [1, 2], mode: 'vs-human' });
  const before = JSON.stringify(state);
  expect(diceOrderMove(state, 0, false)).toBeNull();
  expect(JSON.stringify(state)).toBe(before);
  expect(diceOrderMove(state, 0, true)).toMatchObject({ to: 23, die: 2 });
});

it('bears off exactly and permits oversize only from the farthest checker', () => {
  const state = createPositionState({ placements: [
    { point: 4, player: 'white', count: 2 },
    { point: 2, player: 'white', count: 13 },
    { point: 19, player: 'black', count: 15 },
  ], dice: [4, 6], mode: 'vs-human' });
  expect(diceOrderMove(state, 4, false)).toMatchObject({ to: 25, die: 4 });
  expect(diceOrderMove(state, 4, true)).toMatchObject({ to: 25, die: 6 });
  expect(diceOrderMove(state, 2, true)).toBeNull();
});

it('spends one double per tap, through all four uses', () => {
  let state = { ...createInitialState('vs-human'), phase: 'moving' as const, dice: [2, 2] as [number, number], remainingDice: [2, 2, 2, 2] };
  for (let left = 4; left > 0; left--) {
    const move = diceOrderMove(state, 6, true)!;
    expect(move).toMatchObject({ to: 4, die: 2 });
    state = applyMove(state, move) as typeof state;
    expect(state.remainingDice).toHaveLength(left - 1);
  }
  expect(diceOrderMove(state, 6, false)).toBeNull();
});
