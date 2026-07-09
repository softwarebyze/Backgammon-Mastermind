import { BAR_POINT, BEAR_OFF, createInitialState } from './constants';
import {
  appendMoveLogEntry,
  appendNoMoveLogEntry,
  formatMoveLogEntry,
  formatTurnMoveSummary,
  groupMoveLogByTurn,
} from './move-log';
import { applyMove } from './moves';

function afterMove(
  move: { from: number; to: number; dieIndex: number },
  player: 'white' | 'black' = 'white',
  dice: [number, number] = [3, 5],
) {
  const before = {
    ...createInitialState('vs-human'),
    phase: 'moving' as const,
    currentPlayer: player,
    dice,
    remainingDice: [...dice],
  };
  return applyMove(before, move);
}

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

  it('formats and groups a no-move roll', () => {
    const before = {
      ...createInitialState('vs-human'),
      phase: 'no-move' as const,
      currentPlayer: 'white' as const,
      dice: [2, 5] as [number, number],
      remainingDice: [2, 5],
    };
    const log = appendNoMoveLogEntry([], {
      player: 'white',
      dice: [2, 5],
      after: before,
    });
    expect(formatMoveLogEntry(log[0]!)).toBe('White: no move (2, 5)');
    const turns = groupMoveLogByTurn(log);
    expect(turns).toHaveLength(1);
    expect(formatTurnMoveSummary(turns[0]!.moves)).toBe('no move');
  });

  it('appends entries in ply order', () => {
    const move1 = { from: 8, to: 3, dieIndex: 0 };
    const move2 = { from: 6, to: 1, dieIndex: 1 };
    const log = appendMoveLogEntry([], {
      player: 'white',
      dice: [3, 5],
      move: move1,
      after: afterMove(move1),
    });
    const next = appendMoveLogEntry(log, {
      player: 'white',
      dice: [3, 5],
      move: move2,
      after: afterMove(move2),
    });
    expect(next).toHaveLength(2);
    expect(next[1].ply).toBe(2);
    expect(next[0].after).toBeDefined();
  });

  it('groups consecutive plies into turns by player and dice', () => {
    const move1 = { from: 8, to: 3, dieIndex: 0 };
    const move2 = { from: 6, to: 1, dieIndex: 1 };
    const move3 = { from: 24, to: 22, dieIndex: 0 };
    let log = appendMoveLogEntry([], {
      player: 'white',
      dice: [3, 5],
      move: move1,
      after: afterMove(move1),
    });
    log = appendMoveLogEntry(log, {
      player: 'white',
      dice: [3, 5],
      move: move2,
      after: afterMove(move2),
    });
    log = appendMoveLogEntry(log, {
      player: 'black',
      dice: [4, 2],
      move: move3,
      after: afterMove(move3, 'black', [4, 2]),
    });

    const turns = groupMoveLogByTurn(log);
    expect(turns).toHaveLength(2);
    expect(turns[0]?.moves).toHaveLength(2);
    expect(turns[1]?.player).toBe('black');
    expect(formatTurnMoveSummary(turns[0]!.moves)).toBe('8→3 · 6→1');
  });
});
