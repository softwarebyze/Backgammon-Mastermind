import type { GameState, Player } from '@/lib/game/types';

import { decomposePlayerOnRollBoard, gameStateToSageBoard } from 'expo-bgsage';

import { createPositionState } from '@/lib/game/create-position';
import { applyMove, getLegalMoves } from '@/lib/game/moves';

/**
 * Sage returns a finished board. The app recovers the individual moves.
 * These cases play a known legal turn with the app's own rules, then check
 * that the recovery finds a sequence the same rules accept and that lands
 * on that board. White and black, a hit, the bar, and bearing off.
 */
type Step = { from: number; to: number };

function sageBoard(state: GameState, player: Player): number[] {
  return gameStateToSageBoard({
    points: state.points,
    bar: state.bar,
    currentPlayer: player,
    dice: state.dice,
    remainingDice: state.remainingDice,
  });
}

function play(state: GameState, steps: Step[]): GameState {
  let snap = state;
  for (const step of steps) {
    const legal = getLegalMoves(snap).find(m => m.from === step.from && m.to === step.to);
    if (!legal) {
      throw new Error(`illegal ${step.from}→${step.to} with dice [${snap.remainingDice}]`);
    }
    snap = applyMove(snap, legal);
  }
  return snap;
}

function expectRecovered(state: GameState, steps: Step[]) {
  const player = state.currentPlayer;
  const dice = [...state.remainingDice];
  const start = sageBoard(state, player);
  const end = sageBoard(play(state, steps), player);
  const seq = decomposePlayerOnRollBoard(start, end, dice);
  expect(seq).not.toBeNull();

  const recovered = seq!.map(m => ({
    from: m.from === 25 ? 0 : (player === 'white' ? m.from : 25 - m.from),
    to: m.to === 0 ? 25 : (player === 'white' ? m.to : 25 - m.to),
  }));
  expect(sageBoard(play(state, recovered), player)).toEqual(end);
  expect(recovered).toEqual(steps);
}

describe('sage move recovery', () => {
  it('recovers white’s opening 3-1 builders', () => {
    const state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
      dice: [3, 1],
    });
    expectRecovered(state, [
      { from: 8, to: 5 },
      { from: 6, to: 5 },
    ]);
  });

  it('recovers black’s opening 3-1 split', () => {
    const state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'black',
      dice: [3, 1],
    });
    expectRecovered(state, [
      { from: 17, to: 20 },
      { from: 19, to: 20 },
    ]);
  });

  it('recovers a hit', () => {
    const state = createPositionState({
      currentPlayer: 'white',
      dice: [3, 1],
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 13, player: 'white', count: 2 },
        { point: 5, player: 'black', count: 1 },
      ],
    });
    expectRecovered(state, [
      { from: 8, to: 5 },
      { from: 13, to: 12 },
    ]);
  });

  it('recovers entering from the bar, including a hit', () => {
    const state = createPositionState({
      currentPlayer: 'white',
      dice: [5, 2],
      bar: { white: 1 },
      placements: [
        { point: 20, player: 'black', count: 1 },
        { point: 13, player: 'white', count: 2 },
      ],
    });
    expectRecovered(state, [
      { from: 0, to: 20 },
      { from: 13, to: 11 },
    ]);
  });

  it('recovers white bearing off', () => {
    const state = createPositionState({
      currentPlayer: 'white',
      dice: [6, 1],
      placements: [
        { point: 6, player: 'white', count: 1 },
        { point: 1, player: 'white', count: 1 },
      ],
    });
    expectRecovered(state, [
      { from: 6, to: 25 },
      { from: 1, to: 25 },
    ]);
  });

  it('recovers black bearing off', () => {
    const state = createPositionState({
      currentPlayer: 'black',
      dice: [6, 1],
      placements: [
        { point: 19, player: 'black', count: 1 },
        { point: 24, player: 'black', count: 1 },
      ],
    });
    expectRecovered(state, [
      { from: 19, to: 25 },
      { from: 24, to: 25 },
    ]);
  });
});
