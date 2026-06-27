import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import { useCallback, useState } from 'react';

import {
  canRedoTimeline,
  canUndoTimeline,
  createTimeline,
  pushTimelineSnapshot,
} from '@/lib/game/game-timeline';

export function useGameTimeline() {
  const [timeline, setTimeline] = useState<GameTimeline | null>(null);

  const resetTimeline = useCallback((initial: GameState) => {
    setTimeline(createTimeline(initial));
  }, []);

  const clearTimeline = useCallback(() => {
    setTimeline(null);
  }, []);

  const recordTimelineMove = useCallback((next: GameState) => {
    setTimeline((prev) => {
      if (!prev) {
        return createTimeline(next);
      }
      return pushTimelineSnapshot(prev, next);
    });
  }, []);

  return {
    timeline,
    setTimeline,
    canUndo: timeline != null && canUndoTimeline(timeline),
    canRedo: timeline != null && canRedoTimeline(timeline),
    resetTimeline,
    clearTimeline,
    recordTimelineMove,
  };
}
