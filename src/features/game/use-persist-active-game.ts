import type { GameState } from '@/lib/game';
import type { CubeHistoryEvent } from '@/lib/game/cube-history';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useEffect } from 'react';
import { savePersistedSession } from '@/lib/game/persistence';

// eslint-disable-next-line max-params -- atomically persist board, replay and event history
export function usePersistActiveGame(
  state: GameState | null,
  moveLog: MoveLogEntry[],
  replayBaseline: GameState | null,
  cubeEvents?: CubeHistoryEvent[],
) {
  useEffect(() => {
    if (!state) {
      return;
    }
    savePersistedSession({ state, moveLog, replayBaseline, cubeEvents });
  }, [state, moveLog, replayBaseline, cubeEvents]);
}
