import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import { useCallback, useRef, useState } from 'react';

import { createTimeline, pushTimelineSnapshot } from '@/lib/game/game-timeline';

export function useGameTimeline() {
  const [timeline, publishTimeline] = useState<GameTimeline | null>(null);
  const live = useRef(timeline);
  const setTimeline = useCallback<Dispatch<SetStateAction<GameTimeline | null>>>((update) => {
    const next = typeof update === 'function' ? update(live.current) : update;
    live.current = next;
    publishTimeline(next);
  }, []);
  const getTimeline = useCallback(() => live.current, []);

  const resetTimeline = useCallback((initial: GameState) => {
    setTimeline(createTimeline(initial));
  }, [setTimeline]);

  const clearTimeline = useCallback(() => {
    setTimeline(null);
  }, [setTimeline]);

  const recordTimelineMove = useCallback((before: GameState, next: GameState) => {
    setTimeline((prev) => {
      if (!prev) {
        return pushTimelineSnapshot(createTimeline(before), before, next);
      }
      return pushTimelineSnapshot(prev, before, next);
    });
  }, [setTimeline]);

  return {
    timeline,
    getTimeline,
    setTimeline,
    resetTimeline,
    clearTimeline,
    recordTimelineMove,
  };
}
