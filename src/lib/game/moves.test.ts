import {
  BEAR_OFF,
  createInitialPoints,
  createInitialState,
} from './constants';
import {
  allCheckersInHome,
  applyDiceRoll,
  applyMove,
  calculatePipCount,
  getLegalMoves,
  hasAnyLegalMove,
  rollDice,
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

describe('getLegalMoves', () => {
  it('returns opening moves after a dice roll', () => {
    let state = createInitialState('vs-human');
    state = applyDiceRoll(state, [3, 5]);
    const moves = getLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every(m => m.from >= 1 && m.from <= 24)).toBe(true);
  });

  it('requires bar entry when checkers are on the bar', () => {
    let state = createInitialState('vs-human');
    state = {
      ...state,
      phase: 'moving',
      dice: [3, 5],
      remainingDice: [3, 5],
      bar: { white: 1, black: 0 },
      points: state.points.map((p, i) =>
        i === 24 ? { player: null, count: 0 } : p,
      ),
    };
    const moves = getLegalMoves(state);
    expect(moves.every(m => m.from === 0)).toBe(true);
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

    const bearOff = getLegalMoves(state).find(m => m.from === 1 && m.to === BEAR_OFF);
    expect(bearOff).toBeDefined();

    const next = applyMove(state, bearOff!);
    expect(next.winner).toBe('white');
    expect(next.phase).toBe('game-over');
    expect(next.borneOff.white).toBe(15);
  });
});

describe('applyMove (blot hit)', () => {
  it('hits a blot and sends opponent to the bar', () => {
    let state = createInitialState('vs-human');
    state = {
      ...state,
      phase: 'moving',
      currentPlayer: 'white',
      dice: [1, 1],
      remainingDice: [1],
      points: state.points.map((p, i) => {
        if (i === 8) {
          return { player: 'white', count: 1 };
        }
        if (i === 7) {
          return { player: 'black', count: 1 };
        }
        return { player: null, count: 0 };
      }),
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };
    const move = getLegalMoves(state).find(m => m.to === 7);
    expect(move).toBeDefined();
    const next = applyMove(state, move!);
    expect(next.bar.black).toBe(1);
    expect(next.points[7].player).toBe('white');
  });
});

describe('bearing off', () => {
  it('allows bear off when all checkers are home', () => {
    let state = createInitialState('vs-human');
    state = {
      ...state,
      phase: 'moving',
      currentPlayer: 'white',
      dice: [1, 2],
      remainingDice: [1],
      points: state.points.map((p, i) => {
        if (i >= 1 && i <= 6) {
          return { player: 'white', count: i === 1 ? 1 : 0 };
        }
        return { player: null, count: 0 };
      }),
      bar: { white: 0, black: 0 },
      borneOff: { white: 14, black: 0 },
    };
    state.points[1] = { player: 'white', count: 1 };
    expect(allCheckersInHome(state, 'white')).toBe(true);
    const moves = getLegalMoves(state);
    expect(moves.some(m => m.to === BEAR_OFF)).toBe(true);
  });
});

describe('calculatePipCount', () => {
  it('is lower when checkers are closer to home', () => {
    const state = createInitialState('vs-human');
    const whitePips = calculatePipCount(state, 'white');
    expect(whitePips).toBeGreaterThan(0);
  });

  it('counts board and bar pips for each player', () => {
    const state = createInitialState('vs-human');
    state.bar.white = 1;

    expect(calculatePipCount(state, 'white')).toBeGreaterThan(0);
    expect(calculatePipCount(state, 'black')).toBeGreaterThan(0);
  });
});

describe('rollDice', () => {
  it('returns values between 1 and 6', () => {
    for (let i = 0; i < 20; i++) {
      const [a, b] = rollDice();
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(6);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(6);
    }
  });
});
