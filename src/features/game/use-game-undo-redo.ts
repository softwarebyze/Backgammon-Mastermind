import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import { useCallback } from 'react';

import {
  canRedoTimeline,
  canUndoTimeline,
  currentTimelineState,
  redoTimeline,
  undoTimeline,
} from '@/lib/game/game-timeline';

type Options = {
  timeline: GameTimeline | null;
  setTimeline: Dispatch<SetStateAction<GameTimeline | null>>;
  setState: Dispatch<SetStateAction<GameState | null>>;
  isAnimating: boolean;
  resetAnimation: () => void;
};

export function useGameUndoRedo({
  timeline,
  setTimeline,
  setState,
  isAnimating,
  resetAnimation,
}: Options) {
  const doUndo = useCallback(() => {
    if (!timeline || !canUndoTimeline(timeline) || isAnimating) {
      return;
    }
    const nextTimeline = undoTimeline(timeline);
    setTimeline(nextTimeline);
    setState(currentTimelineState(nextTimeline));
    resetAnimation();
  }, [timeline, isAnimating, setTimeline, setState, resetAnimation]);

  const doRedo = useCallback(() => {
    if (!timeline || !canRedoTimeline(timeline) || isAnimating) {
      return;
    }
    const nextTimeline = redoTimeline(timeline);
    setTimeline(nextTimeline);
    setState(currentTimelineState(nextTimeline));
    resetAnimation();
  }, [timeline, isAnimating, setTimeline, setState, resetAnimation]);

  return { doUndo, doRedo };
}
