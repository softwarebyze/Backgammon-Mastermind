import { BAR_POINT, BEAR_OFF } from './constants';
import { appendMoveLogEntry, formatMoveLogEntry } from './move-log';

describe('move-log', () => {
  it('formats checker moves in plain language', () => {
    const text = formatMoveLogEntry({
      ply: 1,
      player: 'white',
      dice: [4, 2],
      from: 13,
      to: 11,
    });
    expect(text).toBe('White: 13 → 11 (4, 2)');
  });

  it('formats bar entry and bear-off', () => {
    expect(formatMoveLogEntry({
      ply: 2,
      player: 'black',
      dice: [3, 5],
      from: BAR_POINT,
      to: 22,
    })).toBe('Black: bar → 22 (3, 5)');

    expect(formatMoveLogEntry({
      ply: 3,
      player: 'white',
      dice: [1, 1],
      from: 1,
      to: BEAR_OFF,
    })).toBe('White: 1 → off (1, 1)');
  });

  it('appends entries in ply order', () => {
    const log = appendMoveLogEntry([], {
      player: 'white',
      dice: [3, 5],
      move: { from: 8, to: 3, dieIndex: 0 },
    });
    const next = appendMoveLogEntry(log, {
      player: 'white',
      dice: [3, 5],
      move: { from: 6, to: 1, dieIndex: 1 },
    });
    expect(next).toHaveLength(2);
    expect(next[1].ply).toBe(2);
  });
});
