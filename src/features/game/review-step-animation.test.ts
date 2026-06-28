import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import {
  buildReviewStepAnimation,
  buildReviewStepBackAnimation,
} from '@/features/game/review-helpers';
import { createInitialState } from '@/lib/game/constants';
import { appendMoveLogEntry } from '@/lib/game/move-log';
import { deriveReplayBaseline, stateAtPly } from '@/lib/game/move-replay';
import { applyMove, getLegalMoves } from '@/lib/game/moves';

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

function buildTwoMoveLog(): { baseline: GameState; log: MoveLogEntry[] } {
  const baseline = movingWhiteState();
  const move1 = getLegalMoves(baseline)[0]!;
  const after1 = applyMove(baseline, move1);
  const move2 = getLegalMoves(after1)[0]!;
  const after2 = applyMove(after1, move2);
  const log = appendMoveLogEntry(
    appendMoveLogEntry([], {
      player: baseline.currentPlayer,
      dice: baseline.dice,
      move: move1,
      after: after1,
    }),
    {
      player: after1.currentPlayer,
      dice: after1.dice,
      move: move2,
      after: after2,
    },
  );
  return { baseline: deriveReplayBaseline(after2, log), log };
}

describe('review step animations', () => {
  const { baseline, log } = buildTwoMoveLog();

  it('forward step animates the logged player even when snapshot player differs', () => {
    const entry = log[0]!;
    const frame = buildReviewStepAnimation({
      replayBaseline: baseline,
      moveLog: log,
      targetPly: 1,
      onFinish: () => {},
    });
    expect(frame?.player).toBe(entry.player);
    expect(frame?.from).toBe(entry.from);
    expect(frame?.to).toBe(entry.to);
  });

  it('backward step animates the logged player after turn ends', () => {
    const entry = log[1]!;
    const afterTurn = stateAtPly(baseline, log, 2);
    expect(afterTurn.currentPlayer).not.toBe(entry.player);

    const frame = buildReviewStepBackAnimation({
      replayBaseline: baseline,
      moveLog: log,
      targetPly: 1,
      onFinish: () => {},
    });

    expect(frame?.player).toBe(entry.player);
    expect(frame?.from).toBe(entry.to);
    expect(frame?.to).toBe(entry.from);
  });
});
