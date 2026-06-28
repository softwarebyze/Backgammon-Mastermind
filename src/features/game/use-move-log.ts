import type { GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useMemo, useState } from 'react';

import { appendMoveLogEntry } from '@/lib/game/move-log';
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

  const recordMove = useCallback((before: GameState, move: Move, after: GameState) => {
    setMoveLog((prev) => {
      if (prev.length === 0) {
        saveReplayBaseline(before);
        setStoredBaseline(before);
      }
      return appendMoveLogEntry(prev, {
        player: before.currentPlayer,
        dice: before.dice,
        move,
        after,
      });
    });
  }, []);

  const resetMoveLog = useCallback(() => {
    setMoveLog([]);
    setStoredBaseline(null);
  }, []);

  const reloadMoveLog = useCallback(() => {
    setMoveLog(loadMoveLog());
    setStoredBaseline(loadReplayBaseline());
  }, []);

  const persistMoveLog = useCallback((log: MoveLogEntry[]) => {
    saveMoveLog(log);
    if (storedBaseline) {
      saveReplayBaseline(storedBaseline);
    }
  }, [storedBaseline]);

  return {
    moveLog: resolvedLog,
    replayBaseline,
    recordMove,
    resetMoveLog,
    reloadMoveLog,
    persistMoveLog,
  };
}
