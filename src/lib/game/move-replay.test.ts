import type { GameState } from './types';
import { createInitialState } from './constants';
import { appendMoveLogEntry } from './move-log';
import {
  backfillMoveLogSnapshots,
  deriveReplayBaseline,
  resolveMoveFromLogEntry,
  stateAtPly,
} from './move-replay';
import { applyMove, getLegalMoves } from './moves';

function movingWhiteState(): GameState {
  return {
    ...createInitialState('vs-human'),
    phase: 'moving',
    currentPlayer: 'white',
    dice: [3, 5],
    remainingDice: [3, 5],
    openingRolls: { white: 3, black: 2 },
  };
}

describe('move-replay', () => {
  it('reconstructs board after each logged ply from baseline', () => {
    const baseline = movingWhiteState();
    const move = getLegalMoves(baseline)[0]!;
    const next = applyMove(baseline, move);
    const log = appendMoveLogEntry([], {
      player: baseline.currentPlayer,
      dice: baseline.dice,
      move,
      after: next,
    });

    expect(stateAtPly(baseline, log, 0).points[move.from].count)
      .toBe(baseline.points[move.from].count);
    expect(stateAtPly(baseline, log, 1).points[move.to].player)
      .toBe(next.points[move.to].player);
  });

  it('resolves moves from log entries on a live state', () => {
    const baseline = movingWhiteState();
    const move = getLegalMoves(baseline)[0]!;
    const entry = appendMoveLogEntry([], {
      player: baseline.currentPlayer,
      dice: baseline.dice,
      move,
      after: applyMove(baseline, move),
    })[0]!;

    expect(resolveMoveFromLogEntry(baseline, entry)?.to).toBe(move.to);
  });

  it('derives baseline by rewinding the log from live state', () => {
    const baseline = movingWhiteState();
    const move = getLegalMoves(baseline)[0]!;
    const after = applyMove(baseline, move);
    const log = appendMoveLogEntry([], {
      player: baseline.currentPlayer,
      dice: baseline.dice,
      move,
      after,
    });

    const derived = deriveReplayBaseline(after, log);
    expect(derived.points[move.from].count).toBe(baseline.points[move.from].count);
  });

  it('backfills missing snapshots for legacy logs', () => {
    const baseline = movingWhiteState();
    const move = getLegalMoves(baseline)[0]!;
    const after = applyMove(baseline, move);
    const legacyLog = [{
      ply: 1,
      player: baseline.currentPlayer,
      dice: baseline.dice,
      from: move.from,
      to: move.to,
    }];

    const backfilled = backfillMoveLogSnapshots(baseline, legacyLog);
    expect(backfilled[0]?.after?.points[move.to].player).toBe(after.points[move.to].player);
    expect(stateAtPly(baseline, backfilled, 1).points[move.to].player)
      .toBe(after.points[move.to].player);
  });

  it('does not fabricate a hit when opponent was already on the bar', () => {
    const baseline = {
      ...movingWhiteState(),
      bar: { white: 0, black: 1 },
      points: movingWhiteState().points.map((p, i) => {
        if (i === 8) {
          return { player: 'white' as const, count: 2 };
        }
        if (i === 5) {
          return { player: null, count: 0 };
        }
        return { ...p };
      }),
      dice: [3, 1] as [number, number],
      remainingDice: [3, 1],
    };
    const move = { from: 8, to: 5, dieIndex: 0 };
    const after = applyMove(baseline, move);
    expect(after.bar.black).toBe(1);
    expect(after.points[5].player).toBe('white');
    expect(after.points[5].count).toBe(1);

    const log = appendMoveLogEntry([], {
      player: 'white',
      dice: baseline.dice,
      move,
      before: baseline,
      after,
    });
    expect(log[0]?.hit).toBe(false);
    const derived = deriveReplayBaseline(after, log);
    expect(derived.bar.black).toBe(1);
    expect(derived.points[5].player).toBeNull();
    expect(derived.points[8].count).toBe(baseline.points[8].count);
  });
});
