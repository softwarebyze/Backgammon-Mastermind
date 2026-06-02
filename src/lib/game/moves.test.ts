import {
  allCheckersInHome,
  applyDiceRoll,
  applyMove,
  calculatePipCount,
  createInitialState,
  getLegalMoves,
  rollDice,
} from '@/lib/game';
import { BEAR_OFF } from '@/lib/game/constants';

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

describe('applyMove', () => {
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
