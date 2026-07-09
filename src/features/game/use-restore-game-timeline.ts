import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useEffect } from 'react';

import { rebuildTimelineFromLog } from '@/lib/game/game-timeline';

export function useRestoreGameTimeline(args: {
  state: GameState | null;
  timeline: GameTimeline | null;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
  resetTimeline: (initial: GameState) => void;
  setTimeline: Dispatch<SetStateAction<GameTimeline | null>>;
}) {
  const { state, timeline, moveLog, replayBaseline, resetTimeline, setTimeline } = args;

  useEffect(() => {
    if (!state || timeline !== null) {
      return;
    }
    if (moveLog.length === 0) {
      resetTimeline(state);
      return;
    }
    if (replayBaseline) {
      setTimeline(rebuildTimelineFromLog(replayBaseline, moveLog, state));
      return;
    }
    resetTimeline(state);
  }, [state, timeline, moveLog, replayBaseline, resetTimeline, setTimeline]);
}
