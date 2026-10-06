import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { HistoryPathOverlay } from '@/features/game/timeline-history-actions';
import type { GameState } from '@/lib/game/types';

type ReviewSlice = {
  isReviewing: boolean;
  displayState: GameState | null;
  reviewAnimation: MoveAnimationFrame | null;
  pathSegments: PathSegment[];
};

type LivePathOverlays = {
  historyPath: HistoryPathOverlay | null;
  /** Confirm-hold turn arrows; ignored while reviewing or undo/redo path is up. */
  confirmHoldSegments?: PathSegment[];
};

export function deriveGameBoardPresentation(
  review: ReviewSlice,
  moveAnimation: MoveAnimationFrame | null,
  livePaths: LivePathOverlays,
) {
  const { historyPath, confirmHoldSegments = [] } = livePaths;
  const boardState = review.displayState;
  const boardAnimation = review.isReviewing ? review.reviewAnimation : moveAnimation;
  const interactionEnabled = !review.isReviewing;

  let pathSegments: PathSegment[] = [];
  let pathFadeOutMs: number | undefined;
  if (review.isReviewing) {
    pathSegments = review.pathSegments;
  }
  else if (historyPath) {
    // Keep arrow after the checker lands, then soft-fade (see undo/redo hold).
    // Wins over confirm-hold arrows so undo/redo doesn't double-draw a path.
    pathSegments = [{ entry: historyPath.entry, beforeState: historyPath.beforeState, active: true }];
    if (!boardAnimation) {
      pathFadeOutMs = 650;
    }
  }
  else if (confirmHoldSegments.length > 0) {
    pathSegments = confirmHoldSegments;
  }

  return {
    boardState,
    boardAnimation,
    interactionEnabled,
    pathSegments,
    pathFadeOutMs,
  };
}
