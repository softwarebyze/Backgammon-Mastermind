import { BEAR_OFF } from './constants';
import { createPositionState } from './create-position';
import { getForcedDieMove } from './forced-die-move';
import { applyMove, getLegalMoves } from './moves';
import { getForcedTurnSequence } from './single-move';

function screenshotPosition(bearOff = false) {
  return createPositionState({
    placements: [
      ...Object.entries(bearOff ? { 6: 4, 5: 3, 3: 3, 2: 3, 1: 1 } : { 7: 2, 6: 4, 5: 3, 3: 3, 2: 3 })
        .map(([point, count]) => ({ point: Number(point), count, player: 'white' as const })),
      { point: 9, count: 1, player: 'black' },
      { point: 20, count: 3, player: 'black' },
      { point: 22, count: 5, player: 'black' },
      { point: 23, count: 3, player: 'black' },
      { point: 24, count: 2, player: 'black' },
    ],
    bar: { black: 1 },
    borneOff: { white: bearOff ? 1 : 0 },
    dice: bearOff ? [5, 6] : [1, 6],
    mode: 'vs-human',
  });
}

it('plays the mandatory 7→1 six while leaving the one for the player (#309 screenshot A)', () => {
  const state = screenshotPosition();
  expect(getForcedTurnSequence(state)).toBeNull();
  const forced = getForcedDieMove(state);
  expect(forced).toMatchObject({ from: 7, to: 1, die: 6 });
  const next = applyMove(state, forced!);
  expect(next.remainingDice).toEqual([1]);
  expect(getLegalMoves(next).length).toBeGreaterThan(1);
});

it('bears off the mandatory six while leaving the five optional (#309 screenshot B)', () => {
  const state = screenshotPosition(true);
  expect(getForcedTurnSequence(state)).toBeNull();
  const forced = getForcedDieMove(state);
  expect(forced).toMatchObject({ from: 6, to: BEAR_OFF, die: 6 });
  const next = applyMove(state, forced!);
  expect(next.remainingDice).toEqual([5]);
  expect(next.borneOff.white).toBe(2);
  expect(getLegalMoves(next).length).toBeGreaterThan(1);
});

it('does not force the sole six when playing the one first changes what the six can do', () => {
  const state = createPositionState({ placements: [
    { point: 7, count: 1, player: 'white' },
    { point: 6, count: 1, player: 'white' },
    { point: 24, count: 15, player: 'black' },
  ], borneOff: { white: 13 }, dice: [1, 6], mode: 'vs-human' });
  expect(getLegalMoves(state).filter(m => m.die === 6)).toHaveLength(1);
  expect(getForcedDieMove(state)).toBeNull();
});
