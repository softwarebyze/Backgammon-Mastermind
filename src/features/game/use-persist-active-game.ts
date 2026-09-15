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
    savePersistedSession({ state, moveLog, replayBaseline });
  }, [state, moveLog, replayBaseline]);
}
