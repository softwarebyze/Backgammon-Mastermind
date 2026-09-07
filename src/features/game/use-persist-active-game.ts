import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useEffect } from 'react';
import { savePersistedSession } from '@/lib/game/persistence';

export function usePersistActiveGame(
  state: GameState | null,
  moveLog: MoveLogEntry[],
  replayBaseline: GameState | null,
) {
  useEffect(() => {
    if (!state) {
      return;
    }
    // Atomic session write from #167. History lives in the same blob as board
    // state, so selection/dice updates rewrite the session; splitting keys
    // would regress crash recovery and completed-game review.
    savePersistedSession({ state, moveLog, replayBaseline });
  }, [state, moveLog, replayBaseline]);
}
