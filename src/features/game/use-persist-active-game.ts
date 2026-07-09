import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useEffect } from 'react';
import { clearActiveGame, isResumableGame, saveActiveGame } from '@/lib/game/persistence';

export function usePersistActiveGame(
  state: GameState | null,
  moveLog: MoveLogEntry[],
  persistMoveLog: (log: MoveLogEntry[]) => void,
) {
  useEffect(() => {
    if (!state) {
      return;
    }
    if (!isResumableGame(state)) {
      clearActiveGame();
      return;
    }
    saveActiveGame(state);
    persistMoveLog(moveLog);
  }, [state, moveLog, persistMoveLog]);
}
