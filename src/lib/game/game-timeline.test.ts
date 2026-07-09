import { createInitialState } from './constants';
import {
  canRedoTimeline,
  createTimeline,
  currentTimelineState,
  pushTimelineSnapshot,
  redoTimeline,
  undoTimeline,
} from './game-timeline';
import { appendMoveLogEntry } from './move-log';

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
