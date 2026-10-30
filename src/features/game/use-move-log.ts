import type { GameState, Move } from '@/lib/game';
import type { CubeHistoryEvent } from '@/lib/game/cube-history';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useMemo, useRef, useState } from 'react';
import { appendCubeHistoryEvent } from '@/lib/game/cube-history';

import { appendMoveLogEntry, appendNoMoveLogEntry } from '@/lib/game/move-log';
import { backfillMoveLogSnapshots, deriveReplayBaseline } from '@/lib/game/move-replay';
import {
  clearMoveLogAndBaseline,
  loadMoveLog,
  loadPersistedSession,
  loadReplayBaseline,
  saveReplayBaseline,
} from '@/lib/game/persistence';

// eslint-disable-next-line max-lines-per-function -- shared lifecycle for checker and cube history
export function useMoveLog(liveState: GameState | null) {
  const [cubeEvents, setCubeEvents] = useState<CubeHistoryEvent[]>(() => loadPersistedSession()?.cubeEvents ?? []);
  const eventsRef = useRef(cubeEvents);
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
    if (moveLog.length === 0 && cubeEvents.length === 0) {
      return null;
    }
    if (storedBaseline) {
      return storedBaseline;
    }
    if (!liveState) {
      return null;
    }
    return deriveReplayBaseline(liveState, moveLog);
  }, [liveState, moveLog, storedBaseline, cubeEvents.length]);

  const resolvedLog = useMemo(() => {
    if (!replayBaseline || moveLog.length === 0) {
      return moveLog;
    }
    return backfillMoveLogSnapshots(replayBaseline, moveLog);
  }, [moveLog, replayBaseline]);

  const ensureBaseline = useCallback((before: GameState) => {
    if (logRef.current.length === 0 && eventsRef.current.length === 0) {
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
      before,
      after,
    }));
  }, [commitLog, ensureBaseline]);

  /** Returns whether a new entry was logged (a blocked tail of a played turn adds none). */
  const recordNoMove = useCallback((before: GameState, after: GameState): boolean => {
    ensureBaseline(before);
    const next = appendNoMoveLogEntry(logRef.current, {
      player: before.currentPlayer,
      dice: before.dice,
      after,
    });
    if (next === logRef.current) {
      return false;
    }
    commitLog(next);
    return true;
  }, [commitLog, ensureBaseline]);

  const recordCubeEvent = useCallback((kind: CubeHistoryEvent['kind'], before: GameState, after: GameState) => {
    ensureBaseline(before);
    const next = appendCubeHistoryEvent(eventsRef.current, kind, before, after, logRef.current.length);
    eventsRef.current = next;
    setCubeEvents(next);
  }, [ensureBaseline]);

  const resetMoveLog = useCallback(() => {
    commitLog([]);
    eventsRef.current = [];
    setCubeEvents([]);
    setStoredBaseline(null);
    // Sync clear so a kill mid-reset cannot reload the previous review log.
    clearMoveLogAndBaseline();
  }, [commitLog]);

  const reloadMoveLog = useCallback(() => {
    commitLog(loadMoveLog());
    eventsRef.current = loadPersistedSession()?.cubeEvents ?? [];
    setCubeEvents(eventsRef.current);
    setStoredBaseline(loadReplayBaseline());
  }, [commitLog]);

  const popLastMove = useCallback((): MoveLogEntry | null => {
    const prev = logRef.current;
    if (prev.length === 0) {
      return null;
    }
    const popped = prev[prev.length - 1]!;
    if (prev.length === 1 && eventsRef.current.length === 0) {
      setStoredBaseline(null);
    }
    commitLog(prev.slice(0, -1));
    return popped;
  }, [commitLog]);

  const restoreMove = useCallback((entry: MoveLogEntry) => {
    commitLog([...logRef.current, entry]);
  }, [commitLog]);

  const getMoveLog = useCallback(() => logRef.current, []);

  return {
    getMoveLog,
    cubeEvents,
    recordCubeEvent,
    moveLog: resolvedLog,
    replayBaseline,
    recordMove,
    recordNoMove,
    resetMoveLog,
    reloadMoveLog,
    popLastMove,
    restoreMove,
  };
}
