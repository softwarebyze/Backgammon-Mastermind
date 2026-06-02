import { createInitialPoints, createInitialState } from './constants';
import {
  applyDiceRoll,
  applyMove,
  calculatePipCount,
  getLegalMoves,
  hasAnyLegalMove,
} from './moves';

describe('createInitialPoints', () => {
  it('sets the standard 2-5-3-5 starting layout', () => {
    const points = createInitialPoints();

    expect(points[24]).toEqual({ player: 'white', count: 2 });
    expect(points[13]).toEqual({ player: 'white', count: 5 });
    expect(points[8]).toEqual({ player: 'white', count: 3 });
    expect(points[6]).toEqual({ player: 'white', count: 5 });
    expect(points[1]).toEqual({ player: 'black', count: 2 });
    expect(points[12]).toEqual({ player: 'black', count: 5 });
    expect(points[17]).toEqual({ player: 'black', count: 3 });
    expect(points[19]).toEqual({ player: 'black', count: 5 });
  });
});

describe('applyDiceRoll', () => {
  it('enters the moving phase with both dice available', () => {
    const state = createInitialState('vs-human');
    const next = applyDiceRoll(state, [3, 5]);

    expect(next.phase).toBe('moving');
    expect(next.dice).toEqual([3, 5]);
    expect(next.remainingDice).toEqual([3, 5]);
    expect(hasAnyLegalMove(next)).toBe(true);
  });

  it('grants four moves on doubles', () => {
    const state = createInitialState('vs-human');
    const next = applyDiceRoll(state, [4, 4]);

    expect(next.remainingDice).toEqual([4, 4, 4, 4]);
  });

  it('passes the turn when no legal move exists', () => {
    const state = createInitialState('vs-human');
    state.bar.white = 1;
    state.points[24].count = 1;
    state.points[13].count = 0;

    const next = applyDiceRoll(state, [6, 6]);

    expect(next.currentPlayer).toBe('black');
    expect(next.phase).toBe('rolling');
    expect(next.remainingDice).toEqual([]);
  });
});

describe('getLegalMoves / applyMove', () => {
  it('moves a checker and consumes one die', () => {
    let state = createInitialState('vs-human');
    state = applyDiceRoll(state, [1, 2]);

    const move = getLegalMoves(state).find(m => m.from === 24 && m.to === 23);
    expect(move).toBeDefined();

    const next = applyMove(state, move!);
    expect(next.points[24].count).toBe(1);
    expect(next.points[23]).toEqual({ player: 'white', count: 1 });
    expect(next.remainingDice).toEqual([2]);
    expect(next.phase).toBe('moving');
  });

  it('hits a blot and sends the opponent to the bar', () => {
    let state = createInitialState('vs-human');
    state.points[8] = { player: null, count: 0 };
    state.points[6] = { player: 'white', count: 1 };
    state.points[5] = { player: 'black', count: 1 };
    state = applyDiceRoll(state, [1, 1]);

    const hit = getLegalMoves(state).find(m => m.from === 6 && m.to === 5);
    expect(hit).toBeDefined();

    const next = applyMove(state, hit!);
    expect(next.points[5]).toEqual({ player: 'white', count: 1 });
    expect(next.bar.black).toBe(1);
  });

  it('requires bar entry before other moves', () => {
    let state = createInitialState('vs-human');
    state.bar.white = 1;
    state = applyDiceRoll(state, [3, 5]);

    const moves = getLegalMoves(state);
    expect(moves.every(m => m.from === 0)).toBe(true);
    expect(moves.some(m => m.to === 22)).toBe(true);
  });

  it('ends the game when the fifteenth checker is borne off', () => {
    let state = createInitialState('vs-human');
    state.currentPlayer = 'white';
    state.borneOff.white = 14;
    state.points[1] = { player: 'white', count: 1 };
    for (let p = 2; p <= 24; p++) {
      state.points[p] = { player: null, count: 0 };
    }
    state = applyDiceRoll(state, [1, 2]);

    const bearOff = getLegalMoves(state).find(m => m.from === 1 && m.to === 25);
    expect(bearOff).toBeDefined();

    const next = applyMove(state, bearOff!);
    expect(next.winner).toBe('white');
    expect(next.phase).toBe('game-over');
    expect(next.borneOff.white).toBe(15);
  });
});

describe('calculatePipCount', () => {
  it('counts board and bar pips for each player', () => {
    const state = createInitialState('vs-human');
    state.bar.white = 1;

    expect(calculatePipCount(state, 'white')).toBeGreaterThan(0);
    expect(calculatePipCount(state, 'black')).toBeGreaterThan(0);
  });
});
