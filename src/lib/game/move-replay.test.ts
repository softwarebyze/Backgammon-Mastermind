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
});
