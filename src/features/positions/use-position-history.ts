import type { Position } from '@/lib/positions/position';
import type { PositionHistory } from '@/lib/positions/position-history';
import { useCallback, useMemo, useState } from 'react';
import { beginStroke, endStroke, recordChange, redo, startHistory, undo } from '@/lib/positions/position-history';

/** Workspace position with undo/redo; drags are bracketed into single steps. */
export function usePositionHistory(initial: () => Position) {
  const [history, setHistory] = useState<PositionHistory>(() => startHistory(initial()));
  const change = useCallback((next: Position) => setHistory(h => recordChange(h, next)), []);
  const actions = useMemo(() => ({
    change,
    strokeStart: () => setHistory(beginStroke),
    strokeEnd: () => setHistory(endStroke),
    undo: () => setHistory(undo),
    redo: () => setHistory(redo),
  }), [change]);
  return {
    position: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    ...actions,
  };
}
