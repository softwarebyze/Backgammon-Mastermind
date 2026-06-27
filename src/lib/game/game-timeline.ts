import type { GameState } from './types';

export type GameTimeline = {
  /** snapshots[0] = start position; snapshots[i] = after i completed moves */
  snapshots: GameState[];
  /** Index into snapshots for the live board position */
  cursor: number;
  /** Forward stack when undo has been used */
  redo: GameState[];
};

function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    points: state.points.map(p => ({ ...p })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    remainingDice: [...state.remainingDice],
    openingRolls: { ...state.openingRolls },
    legalMovesForSelected: [],
    selectedPoint: null,
  };
}

export function createTimeline(initial: GameState): GameTimeline {
  return {
    snapshots: [cloneGameState(initial)],
    cursor: 0,
    redo: [],
  };
}

export function currentTimelineState(timeline: GameTimeline): GameState {
  return timeline.snapshots[timeline.cursor]!;
}

export function canUndoTimeline(timeline: GameTimeline): boolean {
  return timeline.cursor > 0;
}

export function canRedoTimeline(timeline: GameTimeline): boolean {
  return timeline.redo.length > 0;
}

/** Record a completed move — call after each move is applied to live state. */
export function pushTimelineSnapshot(timeline: GameTimeline, next: GameState): GameTimeline {
  const base = timeline.snapshots.slice(0, timeline.cursor + 1);
  return {
    snapshots: [...base, cloneGameState(next)],
    cursor: base.length,
    redo: [],
  };
}

export function undoTimeline(timeline: GameTimeline): GameTimeline {
  if (!canUndoTimeline(timeline)) {
    return timeline;
  }
  const current = currentTimelineState(timeline);
  return {
    snapshots: timeline.snapshots,
    cursor: timeline.cursor - 1,
    redo: [cloneGameState(current), ...timeline.redo],
  };
}

export function redoTimeline(timeline: GameTimeline): GameTimeline {
  if (!canRedoTimeline(timeline)) {
    return timeline;
  }
  const [, ...rest] = timeline.redo;
  return {
    snapshots: timeline.snapshots,
    cursor: timeline.cursor + 1,
    redo: rest,
  };
}

export function replaceTimelineHead(timeline: GameTimeline, state: GameState): GameTimeline {
  if (timeline.cursor !== timeline.snapshots.length - 1) {
    return timeline;
  }
  const snapshots = [...timeline.snapshots];
  snapshots[timeline.cursor] = cloneGameState(state);
  return { ...timeline, snapshots, redo: [] };
}
