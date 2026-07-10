import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import {
  applyReviewPresenterOverlay,
  reviewBeforeStateForHighlight,
  reviewDiceForPly,
  reviewDisplayPly,
  reviewEffectivePly,
  reviewHighlightMovePly,
  reviewMoveEntry,
  shouldAcceptReviewAnimationFinish,
} from '@/features/game/review-navigation';
import { planReviewNavigation } from '@/features/game/review-navigator';
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

describe('review navigation ply helpers', () => {
  const { log } = buildTwoMoveLog();

  it('keeps board at prior ply while forward animation is in flight', () => {
    expect(reviewDisplayPly(0, 1, 'forward')).toBe(0);
    expect(reviewHighlightMovePly(0, 1, 'forward')).toBe(1);
    expect(reviewMoveEntry(log, 1)?.ply).toBe(1);
  });

  it('keeps board at later ply while backward animation is in flight', () => {
    expect(reviewDisplayPly(2, 1, 'backward')).toBe(2);
    expect(reviewHighlightMovePly(2, 1, 'backward')).toBe(2);
  });

  it('uses effective ply for rapid interrupt decisions', () => {
    expect(reviewEffectivePly(0, 2)).toBe(2);
    expect(reviewDisplayPly(0, 2, 'forward')).toBe(1);
  });
});

describe('review dice presenter', () => {
  const { baseline, log } = buildTwoMoveLog();

  it('shows rolled dice after turn ends instead of empty placeholders', () => {
    const endSnap = stateAtPly(baseline, log, 2);
    expect(endSnap.dice).toEqual([0, 0]);

    const dice = reviewDiceForPly(log, 2, endSnap);
    expect(dice.dice).toEqual([3, 5]);
    expect(dice.dice[0]).not.toBe(0);
  });

  it('preserves mid-turn remaining dice from snapshots', () => {
    const midSnap = stateAtPly(baseline, log, 1);
    const dice = reviewDiceForPly(log, 1, midSnap);
    expect(dice.dice).toEqual([3, 5]);
    expect(dice.remainingDice.length).toBeGreaterThan(0);
  });

  it('aligns banner player with the move being viewed after turn ends', () => {
    const snap = stateAtPly(baseline, log, 2);
    const presented = applyReviewPresenterOverlay(log, 2, snap);
    expect(presented.currentPlayer).toBe('white');
    expect(presented.phase).toBe('rolling');
    expect(presented.dice).toEqual([3, 5]);
  });

  it('derives before-state for arrow anchors from pre-move board', () => {
    const entry = log[0]!;
    const before = reviewBeforeStateForHighlight(baseline, log, 1);
    expect(before?.points[entry.from].count).toBeGreaterThan(0);
  });
});

describe('review animation generation guard', () => {
  it('drops stale completion callbacks after cancel', () => {
    const ref = { current: 2 };
    expect(shouldAcceptReviewAnimationFinish(1, ref)).toBe(false);
    expect(shouldAcceptReviewAnimationFinish(2, ref)).toBe(true);
  });
});

describe('planReviewNavigation (jump)', () => {
  it('plans instant jump when target is adjacent', () => {
    expect(planReviewNavigation(2, 1, 4)).toEqual({ mode: 'jump', ply: 1 });
  });

  it('plans jump when more than one ply away', () => {
    expect(planReviewNavigation(4, 1, 6)).toEqual({ mode: 'jump', ply: 1 });
  });
});
