import type { GameState } from './types';
import { createInitialPoints, createInitialState } from './constants';
import {
  canRedoTimeline,
  canUndoTimeline,
  createTimeline,
  currentTimelineState,
  pushTimelineSnapshot,
  redoTimeline,
  undoTimeline,
} from './game-timeline';
import { applyMove } from './moves';

function movingState(remainingDice: number[]): GameState {
  const points = createInitialPoints().map(() => ({ player: null as 'white' | 'black' | null, count: 0 }));
  points[24] = { player: 'white', count: 1 };
  points[23] = { player: 'white', count: 1 };
  return {
    ...createInitialState('vs-human'),
    phase: 'moving',
    currentPlayer: 'white',
    dice: [1, 1],
    remainingDice,
    points,
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  };
}

describe('game-timeline', () => {
  it('undo and redo walk linear move history', () => {
    let live = movingState([1, 1]);
    let timeline = createTimeline(live);

    live = applyMove(live, { from: 24, to: 23, dieIndex: 0 });
    timeline = pushTimelineSnapshot(timeline, live);
    live = applyMove(live, { from: 23, to: 22, dieIndex: 0 });
    timeline = pushTimelineSnapshot(timeline, live);

    expect(timeline.cursor).toBe(2);
    timeline = undoTimeline(timeline);
    expect(currentTimelineState(timeline).points[22].count).toBe(0);
    expect(canRedoTimeline(timeline)).toBe(true);
    timeline = redoTimeline(timeline);
    expect(currentTimelineState(timeline).points[22].count).toBe(1);
  });

  it('new move after undo clears redo stack', () => {
    let live = movingState([1]);
    let timeline = createTimeline(live);
    live = applyMove(live, { from: 24, to: 23, dieIndex: 0 });
    timeline = pushTimelineSnapshot(timeline, live);
    timeline = undoTimeline(timeline);

    live = applyMove(currentTimelineState(timeline), { from: 24, to: 23, dieIndex: 0 });
    timeline = pushTimelineSnapshot(timeline, live);
    expect(canRedoTimeline(timeline)).toBe(false);
    expect(canUndoTimeline(timeline)).toBe(true);
  });
});
