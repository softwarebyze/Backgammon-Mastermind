import { createInitialState } from './constants';
import {
  canRedoTimeline,
  createTimeline,
  currentTimelineState,
  pushTimelineSnapshot,
  rebuildTimelineFromLog,
  redoTimeline,
  undoTimeline,
} from './game-timeline';
import { appendMoveLogEntry, appendNoMoveLogEntry } from './move-log';

describe('game-timeline', () => {
  const initial = createInitialState('vs-human');

  it('walks undo/redo and clears redo on new move', () => {
    let timeline = createTimeline(initial);
    const afterOne = { ...initial, phase: 'rolling' as const };
    const afterTwo = { ...afterOne, phase: 'moving' as const };

    timeline = pushTimelineSnapshot(timeline, initial, afterOne);
    timeline = pushTimelineSnapshot(timeline, afterOne, afterTwo);
    expect(timeline.cursor).toBe(2);

    const move2 = {
      ply: 2,
      player: 'white' as const,
      dice: [3, 1] as [number, number],
      from: 8,
      to: 4,
    };
    const move1 = {
      ply: 1,
      player: 'white' as const,
      dice: [3, 1] as [number, number],
      from: 13,
      to: 8,
    };

    timeline = undoTimeline(timeline, move2);
    expect(timeline.cursor).toBe(1);
    expect(currentTimelineState(timeline)).toEqual(afterOne);
    expect(canRedoTimeline(timeline)).toBe(true);

    timeline = undoTimeline(timeline, move1);
    expect(timeline.cursor).toBe(0);

    timeline = redoTimeline(timeline);
    expect(timeline.cursor).toBe(1);

    timeline = pushTimelineSnapshot(timeline, afterOne, afterTwo);
    expect(canRedoTimeline(timeline)).toBe(false);
    expect(timeline.redoMoves).toHaveLength(0);
  });

  it('undo requires the move entry being removed', () => {
    let timeline = createTimeline(initial);
    timeline = pushTimelineSnapshot(timeline, initial, { ...initial, phase: 'rolling' });
    timeline = undoTimeline(timeline, {
      ply: 1,
      player: 'white',
      dice: [4, 2],
      from: 1,
      to: 3,
    });
    expect(timeline.redoMoves[0]?.ply).toBe(1);
  });
});

describe('move-log sync contract', () => {
  const initial = createInitialState('vs-human');
  // Turn-start board, as the persisted replay baseline stores it (roll included).
  const rolledInitial = {
    ...initial,
    phase: 'moving' as const,
    dice: [4, 2] as [number, number],
    remainingDice: [4, 2],
  };

  it('restores a saved timeline with independently owned snapshots and working undo/redo', () => {
    const after = { ...rolledInitial, remainingDice: [2] };
    const log = appendMoveLogEntry([], {
      player: 'white',
      dice: [4, 2],
      move: { from: 13, to: 9, dieIndex: 0 },
      after,
    });
    const restored = rebuildTimelineFromLog(rolledInitial, log, after);
    expect(restored.cursor).toBe(1);
    expect(currentTimelineState(restored)).toEqual(after);
    const undone = undoTimeline(restored, log[0]!);
    expect(currentTimelineState(undone)).toEqual(rolledInitial);
    expect(currentTimelineState(redoTimeline(undone))).toEqual(after);
    restored.snapshots[1]!.points[1]!.count = 99;
    expect(initial.points[1]!.count).toBe(2);
    expect(log[0]!.after!.points[1]!.count).toBe(2);
  });
});

describe('move-log sync contract: rolls and blocked rolls', () => {
  const initial = createInitialState('vs-human');
  const rolledInitial = {
    ...initial,
    phase: 'moving' as const,
    dice: [4, 2] as [number, number],
    remainingDice: [4, 2],
  };

  it('rebuilt timeline hands back the roll when undoing the first move of a turn', () => {
    const afterFirstTurn = {
      ...initial,
      currentPlayer: 'black' as const,
      phase: 'rolling' as const,
      dice: [0, 0] as [number, number],
      remainingDice: [],
    };
    const afterSecondTurnMove = {
      ...afterFirstTurn,
      phase: 'moving' as const,
      dice: [6, 5] as [number, number],
      remainingDice: [5],
    };
    let log = appendMoveLogEntry([], {
      player: 'white',
      dice: [4, 2],
      move: { from: 13, to: 9, dieIndex: 0 },
      after: afterFirstTurn,
    });
    log = appendMoveLogEntry(log, {
      player: 'black',
      dice: [6, 5],
      move: { from: 1, to: 7, dieIndex: 0 },
      after: afterSecondTurnMove,
    });

    const restored = rebuildTimelineFromLog(rolledInitial, log, afterSecondTurnMove);
    const undone = undoTimeline(restored, log[1]!);
    expect(currentTimelineState(undone)).toMatchObject({
      currentPlayer: 'black',
      phase: 'moving',
      dice: [6, 5],
      remainingDice: [6, 5],
    });
  });

  it('rebuilds a blocked roll as a ply that lands on the passed turn', () => {
    const blocked = {
      ...rolledInitial,
      currentPlayer: 'black' as const,
      phase: 'no-move' as const,
      dice: [3, 3] as [number, number],
      remainingDice: [3, 3, 3, 3],
    };
    const log = appendNoMoveLogEntry([], {
      player: 'black',
      dice: [3, 3],
      after: blocked,
    });
    const restored = rebuildTimelineFromLog(rolledInitial, log, blocked);
    expect(restored.cursor).toBe(log.length);
    expect(currentTimelineState(restored)).toMatchObject({ currentPlayer: 'white', phase: 'rolling' });
    const undone = undoTimeline(restored, log[0]!);
    expect(currentTimelineState(undone)).toMatchObject({
      currentPlayer: 'black',
      phase: 'no-move',
      dice: [3, 3],
      remainingDice: [3, 3, 3, 3],
    });
  });

  it('undo with a live state keeps a fresh roll for redo', () => {
    const turnStart = { ...rolledInitial };
    const turnEnd = { ...initial, currentPlayer: 'black' as const, phase: 'rolling' as const };
    const live = {
      ...turnEnd,
      phase: 'moving' as const,
      dice: [6, 1] as [number, number],
      remainingDice: [6, 1],
    };
    const log = appendMoveLogEntry([], {
      player: 'white',
      dice: [4, 2],
      move: { from: 13, to: 9, dieIndex: 0 },
      after: turnEnd,
    });
    const timeline = pushTimelineSnapshot(createTimeline(turnStart), turnStart, turnEnd);

    const withoutLive = redoTimeline(undoTimeline(timeline, log[0]!));
    expect(currentTimelineState(withoutLive).dice).toEqual([0, 0]);

    const withLive = redoTimeline(undoTimeline(timeline, log[0]!, live));
    expect(currentTimelineState(withLive)).toMatchObject({ phase: 'moving', dice: [6, 1], remainingDice: [6, 1] });
  });
});

describe('legacy and live-head timelines', () => {
  const initial = createInitialState('vs-human');

  it('falls back to the live save when legacy history has no snapshots', () => {
    const live = { ...initial, phase: 'rolling' as const };
    const restored = rebuildTimelineFromLog(initial, [{
      ply: 1,
      player: 'white',
      dice: [4, 2],
      from: 13,
      to: 9,
    }], live);
    expect(restored).toEqual(createTimeline(live));
  });

  it('cursor matches move count at live head', () => {
    let timeline = createTimeline(initial);
    const log = appendMoveLogEntry([], {
      player: 'white',
      dice: [3, 1],
      move: { from: 13, to: 8, dieIndex: 0 },
      after: initial,
    });
    timeline = pushTimelineSnapshot(timeline, initial, initial);
    expect(timeline.cursor).toBe(log.length);
  });

  it('undo restores pre-move dice instead of game-start state', () => {
    const beforeMove = {
      ...initial,
      phase: 'moving' as const,
      dice: [4, 2] as [number, number],
      remainingDice: [4, 2],
      currentPlayer: 'white' as const,
    };
    const afterMove = {
      ...beforeMove,
      remainingDice: [2],
    };
    let timeline = createTimeline(initial);
    timeline = pushTimelineSnapshot(timeline, beforeMove, afterMove);
    timeline = undoTimeline(timeline, {
      ply: 1,
      player: 'white',
      dice: [4, 2],
      from: 13,
      to: 8,
    });
    expect(currentTimelineState(timeline)).toEqual(beforeMove);
    expect(currentTimelineState(timeline).phase).toBe('moving');
    expect(currentTimelineState(timeline).remainingDice).toEqual([4, 2]);
  });
});
