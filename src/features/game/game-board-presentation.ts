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

export function deriveGameBoardPresentation(
  review: ReviewSlice,
  moveAnimation: MoveAnimationFrame | null,
  historyPath: HistoryPathOverlay | null,
) {
  const boardState = review.displayState;
  const boardAnimation = review.isReviewing ? review.reviewAnimation : moveAnimation;
  const interactionEnabled = !review.isReviewing && !boardAnimation;

  let pathSegments: PathSegment[] = [];
  let pathFadeOutMs: number | undefined;
  if (review.isReviewing) {
    pathSegments = review.pathSegments;
  }
  else if (historyPath) {
    // Keep arrow after the checker lands, then soft-fade (see undo/redo hold).
    pathSegments = [{ entry: historyPath.entry, beforeState: historyPath.beforeState, active: true }];
    if (!boardAnimation) {
      pathFadeOutMs = 650;
    }
  }

  return {
    boardState,
    boardAnimation,
    interactionEnabled,
    pathSegments,
    pathFadeOutMs,
  };
}
