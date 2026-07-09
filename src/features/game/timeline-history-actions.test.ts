import type { GameState } from '@/lib/game';
import {
  buildRedoHistoryStep,
  buildUndoHistoryStep,
  hasUndoableHumanMove,
  isHumanHistoryStep,
  undoInstant,
} from '@/features/game/timeline-history-actions';
import { runAnimatedUndo } from '@/features/game/timeline-history-runner';
import { createInitialState } from '@/lib/game/constants';
import { createTimeline, pushTimelineSnapshot } from '@/lib/game/game-timeline';
import { appendMoveLogEntry } from '@/lib/game/move-log';
import { deriveReplayBaseline } from '@/lib/game/move-replay';
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

describe('timeline-history-actions', () => {
  it('builds undo animation for the move being removed', () => {
    const baseline = movingWhiteState();
    const move = getLegalMoves(baseline)[0]!;
    const after = applyMove(baseline, move);
    const log = appendMoveLogEntry([], {
      player: baseline.currentPlayer,
      dice: baseline.dice,
      move,
      after,
    });
    const replayBaseline = deriveReplayBaseline(after, log);

    const step = buildUndoHistoryStep({
      replayBaseline,
      moveLog: log,
      undoPly: 1,
      onFinish: () => {},
    });
    expect(step?.path.entry.from).toBe(move.from);
    expect(step?.path.entry.to).toBe(move.to);
    expect(step?.frame?.from).toBe(move.to);
    expect(step?.frame?.to).toBe(move.from);
  });

  it('builds redo animation using the redo entry appended to log', () => {
    const baseline = movingWhiteState();
    const move = getLegalMoves(baseline)[0]!;
    const after = applyMove(baseline, move);
    const log = appendMoveLogEntry([], {
      player: baseline.currentPlayer,
      dice: baseline.dice,
      move,
      after,
    });
    const replayBaseline = deriveReplayBaseline(after, log);
    const entry = log[0]!;

    const step = buildRedoHistoryStep({
      replayBaseline,
      moveLog: [],
      moveEntry: entry,
      cursor: 0,
      onFinish: () => {},
    });
    expect(step.frame?.from).toBe(move.from);
    expect(step.frame?.to).toBe(move.to);
  });

  it('undoInstant restores timeline cursor and dice', () => {
    const initial = createInitialState('vs-human');
    let timeline = createTimeline(initial);
    const beforeMove = {
      ...initial,
      phase: 'moving' as const,
      dice: [4, 2] as [number, number],
      remainingDice: [4, 2],
    };
    const afterMove = { ...beforeMove, remainingDice: [2] };
    timeline = pushTimelineSnapshot(timeline, beforeMove, afterMove);

    const popped = { ply: 1, player: 'white' as const, dice: [4, 2] as [number, number], from: 13, to: 8 };
    const result = undoInstant(timeline, () => popped);
    expect(result?.nextState.remainingDice).toEqual([4, 2]);
    expect(result?.nextTimeline.cursor).toBe(0);
  });
});

describe('vs-computer history gating', () => {
  it('isHumanHistoryStep gates AI redo in vs-computer only', () => {
    const whiteEntry = { ply: 1, player: 'white' as const, dice: [4, 2] as [number, number], from: 13, to: 9 };
    const blackEntry = { ...whiteEntry, player: 'black' as const };
    expect(isHumanHistoryStep('vs-computer', whiteEntry)).toBe(true);
    expect(isHumanHistoryStep('vs-computer', blackEntry)).toBe(false);
    expect(isHumanHistoryStep('vs-computer', null)).toBe(false);
    expect(isHumanHistoryStep('vs-human', blackEntry)).toBe(true);
    expect(isHumanHistoryStep(undefined, null)).toBe(true);
  });

  it('hasUndoableHumanMove requires a white move only in vs-computer', () => {
    const white = { ply: 1, player: 'white' as const, dice: [4, 2] as [number, number], from: 13, to: 9 };
    const black = { ...white, ply: 2, player: 'black' as const };
    expect(hasUndoableHumanMove('vs-computer', [white, black])).toBe(true);
    expect(hasUndoableHumanMove('vs-computer', [black])).toBe(false);
    expect(hasUndoableHumanMove('vs-human', [black])).toBe(true);
  });

  it('vs-computer undo rewinds trailing AI moves down to the human move', () => {
    const base = createInitialState('vs-computer');
    const states = [base];
    let timeline = createTimeline(base);
    const dice = [4, 2] as [number, number];
    const players = ['white', 'black', 'black'] as const;
    const log = players.map((player, i) => {
      const next = { ...states[i]!, dice, remainingDice: [i] };
      timeline = pushTimelineSnapshot(timeline, states[i]!, next);
      states.push(next);
      return { ply: i + 1, player, dice, from: 13, to: 9 };
    });

    // logState simulates React state (popLastMove never mutates the array the
    // runner was handed for this render).
    const logState = [...log];
    const committed: { timeline?: typeof timeline; state?: GameState | null } = {};
    runAnimatedUndo({
      timeline,
      moveLog: [...log],
      replayBaseline: null,
      gameMode: 'vs-computer',
      popLastMove: () => logState.pop() ?? null,
      restoreMove: () => {},
      setTimeline: (t) => {
        committed.timeline = typeof t === 'function' ? t(committed.timeline ?? timeline)! : t!;
      },
      setState: (s) => {
        committed.state = typeof s === 'function' ? s(committed.state ?? null) : s;
      },
      setMoveAnimation: () => {},
      setHistoryPath: () => {},
      finishHistoryAnim: () => {},
    });

    // Both AI moves and the human move are undone; cursor back at the start.
    expect(logState).toHaveLength(0);
    expect(committed.timeline?.cursor).toBe(0);
    expect(committed.timeline?.redoMoves.map(m => m.player)).toEqual(['white', 'black', 'black']);
  });
});
