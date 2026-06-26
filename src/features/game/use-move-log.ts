import type { GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useState } from 'react';

import { appendMoveLogEntry } from '@/lib/game/move-log';
import { loadMoveLog, saveMoveLog } from '@/lib/game/persistence';

export function useMoveLog() {
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>(() => loadMoveLog());

  const recordMove = useCallback((snapshot: GameState, move: Move) => {
    setMoveLog(prev => appendMoveLogEntry(prev, {
      player: snapshot.currentPlayer,
      dice: snapshot.dice,
      move,
    }));
  }, []);

  const resetMoveLog = useCallback(() => {
    setMoveLog([]);
  }, []);

  const reloadMoveLog = useCallback(() => {
    setMoveLog(loadMoveLog());
  }, []);

  const persistMoveLog = useCallback((log: MoveLogEntry[]) => {
    saveMoveLog(log);
  }, []);

  return {
    moveLog,
    recordMove,
    resetMoveLog,
    reloadMoveLog,
    persistMoveLog,
  };
}
