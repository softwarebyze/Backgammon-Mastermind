import type { GameState } from '@/lib/game';
import type { CubeHistoryEvent } from '@/lib/game/cube-history';
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
  cubeEvents?: CubeHistoryEvent[];
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
    cubeEvents,
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
    // Cube decisions occupy the gap between checker plies. The first replay
    // frame of the following turn must already show the accepted cube, while
    // the preceding turn and the explicit Start position keep their old cube.
    const event = cubeEvents?.findLast(event => event.afterPly >= displayPly && event.afterPly < (presenterPly ?? displayPly));
    if (event)
      snap.match = event.after.match;
    return applyReviewPresenterOverlay(moveLog, presenterPly ?? displayPly, snap);
  }, [displayPly, isReviewing, presenterPly, replayBaseline, moveLog, liveState, cubeEvents]);

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
