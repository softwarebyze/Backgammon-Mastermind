import type { GameState, Player } from '@/lib/game/types';

import { createInitialState } from '@/lib/game/constants';
import { classifyStrategy, pipCount } from './strategy';

/** Build a state with explicit point holdings: [point, player, count][]. */
function stateWith(
  holdings: Array<[number, Player, number]>,
  player: Player = 'white',
): GameState {
  const base = createInitialState('vs-human');
  const points = base.points.map(p => ({ ...p }));
  // Clear the board first.
  for (let n = 1; n <= 24; n++) {
    points[n] = { player: null, count: 0 };
  }
  for (const [n, p, count] of holdings) {
    points[n] = { player: p, count };
  }
  return {
    ...base,
    points,
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
    currentPlayer: player,
    phase: 'moving',
  };
}

describe('pipCount', () => {
  it('counts the opening position at 167 pips each', () => {
    const state = createInitialState('vs-human');
    expect(pipCount(state, 'white')).toBe(167);
    expect(pipCount(state, 'black')).toBe(167);
  });

  it('counts bar checkers at 25 and borne-off at 0', () => {
    const state = stateWith([[1, 'white', 2]]);
    const withBar: GameState = {
      ...state,
      bar: { white: 1, black: 0 },
      borneOff: { white: 13, black: 0 },
    };
    // 2 checkers on the 1-point (2 pips) + 1 on the bar (25 pips).
    expect(pipCount(withBar, 'white')).toBe(27);
  });

  it('mirrors distances for black', () => {
    const state = stateWith([[24, 'black', 1]]);
    expect(pipCount(state, 'black')).toBe(1);
    const whiteSame = stateWith([[24, 'white', 1]]);
    expect(pipCount(whiteSame, 'white')).toBe(24);
  });
});

describe('classifyStrategy', () => {
  it('opens as developing', () => {
    const state = createInitialState('vs-human');
    expect(classifyStrategy(state, 'white').key).toBe('developing');
  });

  it('detects a running game with a big pip lead and no contact', () => {
    // White has borne off 10 (50 pips left-ish); black is far behind.
    // No blots anywhere: white points made, black points made.
    const state = stateWith([
      [1, 'white', 2],
      [2, 'white', 2],
      [3, 'white', 1],
      [19, 'black', 3],
      [20, 'black', 2],
    ]);
    const racing: GameState = {
      ...state,
      borneOff: { white: 10, black: 0 },
    };
    expect(pipCount(racing, 'white')).toBeLessThan(pipCount(racing, 'black') * 0.9);
    expect(classifyStrategy(racing, 'white').key).toBe('running');
  });

  it('detects a blitz with enemy blots in the home board', () => {
    const state = stateWith([
      [1, 'white', 2],
      [2, 'white', 2],
      [5, 'white', 2],
      [3, 'black', 1],
      [4, 'black', 1],
      [13, 'black', 2],
    ]);
    expect(classifyStrategy(state, 'white').key).toBe('blitz');
  });

  it('detects a priming game with a four-point wall', () => {
    const state = stateWith([
      [3, 'white', 2],
      [4, 'white', 2],
      [5, 'white', 2],
      [6, 'white', 2],
      [22, 'black', 2],
    ]);
    expect(classifyStrategy(state, 'white').key).toBe('priming');
  });

  it('detects a holding game with an advanced anchor while behind', () => {
    const state = stateWith([
      [20, 'white', 2],
      [13, 'white', 3],
      [8, 'white', 2],
      [21, 'black', 3],
      [22, 'black', 2],
    ]);
    // White behind in the race with a 20-point anchor.
    expect(pipCount(state, 'white')).toBeGreaterThan(pipCount(state, 'black'));
    expect(classifyStrategy(state, 'white').key).toBe('holding');
  });

  it('detects a back game with two deep anchors far behind', () => {
    const state = stateWith([
      [22, 'white', 2],
      [23, 'white', 2],
      [24, 'white', 3],
      [19, 'black', 3],
      [20, 'black', 2],
    ]);
    expect(classifyStrategy(state, 'white').key).toBe('backgame');
  });

  it('prefers backgame over holding when both match', () => {
    const state = stateWith([
      [22, 'white', 2],
      [23, 'white', 2],
      [24, 'white', 3],
      [13, 'black', 2],
      [8, 'black', 2],
      [6, 'black', 2],
    ]);
    expect(classifyStrategy(state, 'white').key).toBe('backgame');
  });
});
