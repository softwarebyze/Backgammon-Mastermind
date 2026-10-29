import type { Position } from './position';

/** Enough to walk back a whole setup session without holding unbounded boards. */
export const HISTORY_LIMIT = 100;

export type PositionHistory = {
  past: Position[];
  present: Position;
  future: Position[];
  /** Board at the start of a drag; the whole stroke becomes one undo step. */
  stroke: Position | null;
};

const same = (a: Position, b: Position) => a === b || JSON.stringify(a) === JSON.stringify(b);

function push(past: Position[], entry: Position): Position[] {
  return [...past, entry].slice(-HISTORY_LIMIT);
}

export function startHistory(present: Position): PositionHistory {
  return { past: [], present, future: [], stroke: null };
}

export function recordChange(history: PositionHistory, next: Position): PositionHistory {
  if (history.stroke)
    return { ...history, present: next };
  if (same(history.present, next))
    return history;
  return { past: push(history.past, history.present), present: next, future: [], stroke: null };
}

export function beginStroke(history: PositionHistory): PositionHistory {
  return history.stroke ? history : { ...history, stroke: history.present };
}

export function endStroke(history: PositionHistory): PositionHistory {
  const start = history.stroke;
  if (!start)
    return history;
  if (same(start, history.present))
    return { ...history, stroke: null };
  return { past: push(history.past, start), present: history.present, future: [], stroke: null };
}

export function undo(history: PositionHistory): PositionHistory {
  const previous = history.past.at(-1);
  if (!previous || history.stroke)
    return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future], stroke: null };
}

export function redo(history: PositionHistory): PositionHistory {
  const [next, ...rest] = history.future;
  if (!next || history.stroke)
    return history;
  return { past: push(history.past, history.present), present: next, future: rest, stroke: null };
}
