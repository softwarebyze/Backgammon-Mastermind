import type { MoveLogEntry } from './move-log';
import type { GameState } from './types';
import { mergeSnapshotIntoState } from './move-log';

export type GameTimeline = {
  /** snapshots[0] = start; snapshots[i] = board after i moves */
  snapshots: GameState[];
  cursor: number;
  /** Forward states after undo (newest first) */
  redo: GameState[];
  /** Move log entries matching redo stack (newest first) */
  redoMoves: MoveLogEntry[];
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
    redoMoves: [],
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

export function timelineLivePly(timeline: GameTimeline): number {
  return timeline.snapshots.length - 1;
}

export function pushTimelineSnapshot(
  timeline: GameTimeline,
  before: GameState,
  next: GameState,
): GameTimeline {
  const snapshots = timeline.snapshots.slice(0, timeline.cursor + 1);
  snapshots[timeline.cursor] = cloneGameState(before);
  return {
    snapshots: [...snapshots, cloneGameState(next)],
    cursor: snapshots.length,
    redo: [],
    redoMoves: [],
  };
}

export function undoTimeline(
  timeline: GameTimeline,
  undoneMove: MoveLogEntry,
): GameTimeline {
  if (!canUndoTimeline(timeline)) {
    return timeline;
  }
  const current = currentTimelineState(timeline);
  return {
    snapshots: timeline.snapshots,
    cursor: timeline.cursor - 1,
    redo: [cloneGameState(current), ...timeline.redo],
    redoMoves: [undoneMove, ...timeline.redoMoves],
  };
}

export function redoTimeline(timeline: GameTimeline): GameTimeline {
  if (!canRedoTimeline(timeline)) {
    return timeline;
  }
  const [_, ...restStates] = timeline.redo;
  const [, ...restMoves] = timeline.redoMoves;
  return {
    snapshots: timeline.snapshots,
    cursor: timeline.cursor + 1,
    redo: restStates,
    redoMoves: restMoves,
  };
}

export function peekRedoMove(timeline: GameTimeline): MoveLogEntry | null {
  return timeline.redoMoves[0] ?? null;
}

/** Rebuild snapshot stack from persisted move log (for resume). */
export function rebuildTimelineFromLog(
  baseline: GameState,
  log: MoveLogEntry[],
  liveState: GameState,
): GameTimeline {
  if (log.length === 0) {
    return createTimeline(liveState);
  }

  let timeline = createTimeline(baseline);
  for (const entry of log) {
    if (!entry.after) {
      break;
    }
    const next = mergeSnapshotIntoState(currentTimelineState(timeline), entry.after);
    timeline = pushTimelineSnapshot(timeline, currentTimelineState(timeline), next);
  }

  if (timeline.cursor === 0 && log.length > 0) {
    return createTimeline(liveState);
  }

  return timeline;
}
