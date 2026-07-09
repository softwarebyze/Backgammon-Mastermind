import type { GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useMemo, useRef, useState } from 'react';

import { appendMoveLogEntry, appendNoMoveLogEntry } from '@/lib/game/move-log';
import { backfillMoveLogSnapshots, deriveReplayBaseline } from '@/lib/game/move-replay';
import {
  loadMoveLog,
  loadReplayBaseline,
  saveMoveLog,
  saveReplayBaseline,
} from '@/lib/game/persistence';

export function useMoveLog(liveState: GameState | null) {
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>(() => loadMoveLog());
  const [storedBaseline, setStoredBaseline] = useState<GameState | null>(
    () => loadReplayBaseline(),
  );
  // Synchronous mirror of moveLog: mutators read/write the ref and commit by
  // value, so multiple pops in one batch (chain undo) each see fresh state.
  const logRef = useRef(moveLog);

  const commitLog = useCallback((next: MoveLogEntry[]) => {
    logRef.current = next;
    setMoveLog(next);
  }, []);

  const replayBaseline = useMemo(() => {
    if (moveLog.length === 0) {
      return null;
    }
    if (storedBaseline) {
      return storedBaseline;
    }
    if (!liveState) {
      return null;
    }
    return deriveReplayBaseline(liveState, moveLog);
  }, [liveState, moveLog, storedBaseline]);

  const resolvedLog = useMemo(() => {
    if (!replayBaseline || moveLog.length === 0) {
      return moveLog;
    }
    return backfillMoveLogSnapshots(replayBaseline, moveLog);
  }, [moveLog, replayBaseline]);

  const ensureBaseline = useCallback((before: GameState) => {
    if (logRef.current.length === 0) {
      saveReplayBaseline(before);
      setStoredBaseline(before);
    }
  }, []);

  const recordMove = useCallback((before: GameState, move: Move, after: GameState) => {
    ensureBaseline(before);
    commitLog(appendMoveLogEntry(logRef.current, {
      player: before.currentPlayer,
      dice: before.dice,
      move,
      after,
    }));
  }, [commitLog, ensureBaseline]);

  const recordNoMove = useCallback((before: GameState, after: GameState) => {
    ensureBaseline(before);
    commitLog(appendNoMoveLogEntry(logRef.current, {
      player: before.currentPlayer,
      dice: before.dice,
      after,
    }));
  }, [commitLog, ensureBaseline]);

  const resetMoveLog = useCallback(() => {
    commitLog([]);
    setStoredBaseline(null);
  }, [commitLog]);

  const reloadMoveLog = useCallback(() => {
    commitLog(loadMoveLog());
    setStoredBaseline(loadReplayBaseline());
  }, [commitLog]);

  const persistMoveLog = useCallback((log: MoveLogEntry[]) => {
    saveMoveLog(log);
    if (storedBaseline) {
      saveReplayBaseline(storedBaseline);
    }
  }, [storedBaseline]);

  const popLastMove = useCallback((): MoveLogEntry | null => {
    const prev = logRef.current;
    if (prev.length === 0) {
      return null;
    }
    const popped = prev[prev.length - 1]!;
    if (prev.length === 1) {
      setStoredBaseline(null);
    }
    commitLog(prev.slice(0, -1));
    return popped;
  }, [commitLog]);

  const restoreMove = useCallback((entry: MoveLogEntry) => {
    commitLog([...logRef.current, entry]);
  }, [commitLog]);

  return {
    moveLog: resolvedLog,
    replayBaseline,
    recordMove,
    recordNoMove,
    resetMoveLog,
    reloadMoveLog,
    persistMoveLog,
    popLastMove,
    restoreMove,
  };
}
