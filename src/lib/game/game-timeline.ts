import type { MoveLogEntry } from './move-log';
import type { GameState } from './types';
import { isNoMoveLogEntry, mergeSnapshotIntoState } from './move-log';
import { passTurn } from './moves';

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

/**
 * Step back one ply. `liveState` is what is actually on the board now; it can
 * be ahead of the stored snapshot (e.g. a fresh roll nobody has moved on yet),
 * so it replaces the snapshot that redo will return to — otherwise redo would
 * drop the roll the player already saw.
 */
export function undoTimeline(
  timeline: GameTimeline,
  undoneMove: MoveLogEntry,
  liveState?: GameState | null,
): GameTimeline {
  if (!canUndoTimeline(timeline)) {
    return timeline;
  }
  let snapshots = timeline.snapshots;
  if (liveState) {
    snapshots = [...snapshots];
    snapshots[timeline.cursor] = cloneGameState(liveState);
  }
  const current = snapshots[timeline.cursor]!;
  return {
    snapshots,
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

/**
 * Board before `entry` was played. Mid-turn that is simply the previous
 * snapshot; at a turn boundary the stored snapshot has no dice yet, so the
 * roll is restored from the log — undoing the first move of a turn must hand
 * back the same roll, never ask the player to roll again.
 */
function boardBeforeEntry(previous: GameState, entry: MoveLogEntry): GameState {
  const noMove = isNoMoveLogEntry(entry);
  if (!noMove && previous.phase === 'moving' && previous.currentPlayer === entry.player) {
    return previous;
  }
  const [a, b] = entry.dice;
  return {
    ...previous,
    currentPlayer: entry.player,
    dice: [a, b],
    remainingDice: a === b ? [a, a, a, a] : [a, b],
    phase: noMove ? 'no-move' : 'moving',
  };
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

  // Build once: pushTimelineSnapshot copies the growing array on every move,
  // making a cold restore quadratic in the length of the saved game.
  const snapshots = [cloneGameState(baseline)];
  for (const entry of log) {
    if (!entry.after) {
      break;
    }
    const previous = snapshots[snapshots.length - 1]!;
    const next = mergeSnapshotIntoState(previous, entry.after);
    snapshots[snapshots.length - 1] = cloneGameState(boardBeforeEntry(previous, entry));
    // A blocked roll is logged before the pass; the live timeline records the
    // board after the pass, so rebuild it the same way.
    snapshots.push(cloneGameState(isNoMoveLogEntry(entry) ? passTurn(next) : next));
  }

  if (snapshots.length === 1) {
    return createTimeline(liveState);
  }

  return { snapshots, cursor: snapshots.length - 1, redo: [], redoMoves: [] };
}
