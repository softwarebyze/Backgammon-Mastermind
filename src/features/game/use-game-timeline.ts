import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import { useCallback, useState } from 'react';

import { createTimeline, pushTimelineSnapshot } from '@/lib/game/game-timeline';

export function useGameTimeline() {
  const [timeline, setTimeline] = useState<GameTimeline | null>(null);

  const resetTimeline = useCallback((initial: GameState) => {
    setTimeline(createTimeline(initial));
  }, []);

  const clearTimeline = useCallback(() => {
    setTimeline(null);
  }, []);

  const recordTimelineMove = useCallback((before: GameState, next: GameState) => {
    setTimeline((prev) => {
      if (!prev) {
        return pushTimelineSnapshot(createTimeline(before), before, next);
      }
      return pushTimelineSnapshot(prev, before, next);
    });
  }, []);

  return {
    timeline,
    setTimeline,
    resetTimeline,
    clearTimeline,
    recordTimelineMove,
  };
}
