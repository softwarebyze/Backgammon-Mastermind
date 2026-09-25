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

  it('explains why: developing cites the lack of structure', () => {
    const state = createInitialState('vs-human');
    const info = classifyStrategy(state, 'white');
    expect(info.why).toMatch(/still taking shape/);
    expect(info.tip).toMatch(/Build points/);
  });

  it('explains why: priming cites the prime length', () => {
    const state = stateWith([
      [3, 'white', 2],
      [4, 'white', 2],
      [5, 'white', 2],
      [6, 'white', 2],
    ]);
    const info = classifyStrategy(state, 'white');
    expect(info.key).toBe('priming');
    expect(info.why).toMatch(/4-point prime/);
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
    // Black has a blot on the 1-point that must escape through white's wall,
    // so the prime means something (and this is not a pure race).
    const state = stateWith([
      [3, 'white', 2],
      [4, 'white', 2],
      [5, 'white', 2],
      [6, 'white', 2],
      [22, 'black', 2],
      [1, 'black', 1],
    ]);
    expect(classifyStrategy(state, 'white').key).toBe('priming');
  });

  it('detects a holding game with an advanced anchor while behind', () => {
    // Black still has checkers at 10 that must travel past white's anchor on
    // the 20-point, so the anchor means something (not a pure race).
    const state = stateWith([
      [20, 'white', 2],
      [13, 'white', 3],
      [8, 'white', 2],
      [21, 'black', 2],
      [10, 'black', 2],
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

describe('classifyStrategy pure race', () => {
  it('calls a pure race a running game even with blots on the board', () => {
    // Black: 15:1, 20:1, 22:2, 23:4, 24:7 (one borne off) — 36 pips.
    // White: 12:1, 6:2, 5:3, 4:2, 3:2, 2:5 — 63 pips.
    // Every white checker has passed every black checker, so no contact is
    // possible despite the blots: the old code read the shot direction
    // backwards and called this "developing".
    const holdings: Array<[number, Player, number]> = [
      [15, 'black', 1],
      [20, 'black', 1],
      [22, 'black', 2],
      [23, 'black', 4],
      [24, 'black', 7],
      [12, 'white', 1],
      [6, 'white', 2],
      [5, 'white', 3],
      [4, 'white', 2],
      [3, 'white', 2],
      [2, 'white', 5],
    ];
    const base = stateWith(holdings, 'black');
    const state: GameState = {
      ...base,
      borneOff: { white: 0, black: 1 },
    };
    expect(pipCount(state, 'black')).toBe(36);
    expect(pipCount(state, 'white')).toBe(63);
    const info = classifyStrategy(state, 'black');
    expect(info.key).toBe('running');
    expect(info.why).toMatch(/straight race/);
  });

  it('still spots a real direct shot behind a blot', () => {
    // White blot on 5 with a black checker on 3: black moves 3 -> 5 and hits.
    // The old backwards check missed this entirely (it looked ahead of the
    // blot instead of behind it).
    const state = stateWith([
      [6, 'white', 2],
      [5, 'white', 1],
      [4, 'white', 2],
      [3, 'black', 1],
      [24, 'black', 8],
    ]);
    expect(pipCount(state, 'white')).toBeLessThan(pipCount(state, 'black') * 0.9);
    // Genuine contact, so this is not a running game despite the pip lead.
    expect(classifyStrategy(state, 'white').key).not.toBe('running');
  });

  it('calls a pure race for the trailer too', () => {
    // No prime, no anchor, no contact — white trails 20 to 12 pips but both
    // sides are just bearing off.
    const state = stateWith([
      [2, 'white', 3],
      [4, 'white', 2],
      [6, 'white', 1],
      [22, 'black', 2],
      [23, 'black', 2],
      [24, 'black', 2],
    ]);
    expect(pipCount(state, 'white')).toBeGreaterThan(pipCount(state, 'black'));
    const info = classifyStrategy(state, 'white');
    expect(info.key).toBe('running');
    expect(info.why).toMatch(/straight race/);
  });

  it('does not call it priming when the prime is behind all enemy checkers', () => {
    // White holds a full 5-prime on 2-6, but every black checker is already
    // past it (19-24): the prime cannot trap anything, so this is a pure
    // race, not a priming game.
    const state = stateWith([
      [2, 'white', 2],
      [3, 'white', 2],
      [4, 'white', 2],
      [5, 'white', 2],
      [6, 'white', 2],
      [12, 'white', 5],
      [19, 'black', 2],
      [20, 'black', 2],
      [22, 'black', 3],
      [23, 'black', 3],
      [24, 'black', 5],
    ], 'white');
    const info = classifyStrategy(state, 'white');
    expect(info.key).toBe('running');
    expect(info.why).toMatch(/straight race/);
  });
});
