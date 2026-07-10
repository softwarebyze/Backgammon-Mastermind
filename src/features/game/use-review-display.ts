import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useMemo } from 'react';
import {
  applyReviewPresenterOverlay,
  reviewBeforeStateForHighlight,
  reviewDisplayPly,
  reviewHighlightMovePly,
  reviewMoveEntry,
} from '@/features/game/review-navigation';
import { stateAtPly } from '@/lib/game/move-replay';

export function useReviewDisplayState(args: {
  liveState: GameState | null;
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  isReviewing: boolean;
  displayPly: number;
  highlightMovePly: number | null;
  /** When set, banner/dice player stay locked to this ply (e.g. turn end while looping). */
  presenterPly?: number;
}) {
  const {
    liveState,
    replayBaseline,
    moveLog,
    isReviewing,
    displayPly,
    highlightMovePly,
    presenterPly,
  } = args;

  const displayState = useMemo(() => {
    if (!liveState) {
      return null;
    }
    if (!isReviewing || !replayBaseline) {
      return liveState;
    }
    const snap = stateAtPly(replayBaseline, moveLog, displayPly);
    return applyReviewPresenterOverlay(moveLog, presenterPly ?? displayPly, snap);
  }, [displayPly, isReviewing, presenterPly, replayBaseline, moveLog, liveState]);

  const activeEntry = useMemo(
    () => (isReviewing ? reviewMoveEntry(moveLog, highlightMovePly) : null),
    [highlightMovePly, isReviewing, moveLog],
  );

  const reviewBeforeState = useMemo(
    () => (isReviewing && highlightMovePly
      ? reviewBeforeStateForHighlight(replayBaseline, moveLog, highlightMovePly)
      : null),
    [highlightMovePly, isReviewing, moveLog, replayBaseline],
  );

  return { displayState, activeEntry, reviewBeforeState };
}

export function computeReviewPlies(args: {
  viewIndex: number;
  liveIndex: number;
  manualIndex: number | null;
  pendingAnimTarget: number | null;
  pendingAnimDirection: 'forward' | 'backward' | null;
  isFading: boolean;
}) {
  const { viewIndex, liveIndex, manualIndex, pendingAnimTarget, pendingAnimDirection, isFading } = args;
  const isReviewing = manualIndex !== null || pendingAnimTarget !== null || isFading;
  const displayPly = isReviewing
    ? reviewDisplayPly(viewIndex, pendingAnimTarget, pendingAnimDirection)
    : liveIndex;
  const highlightMovePly = reviewHighlightMovePly(viewIndex, pendingAnimTarget, pendingAnimDirection);
  const scrubberPly = reviewDisplayPly(viewIndex, pendingAnimTarget, pendingAnimDirection);
  return { isReviewing, displayPly, highlightMovePly, scrubberPly };
}
