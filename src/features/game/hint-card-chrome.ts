import { REVIEW_SLOT_HEIGHT } from '@/features/game/hooks/use-board-dimensions';

/**
 * Portrait: the board gets whatever height the review strip and controls
 * leave. The open hint card is 56px taller than the Hint button, so while
 * it is open the review strip steps aside and the controls take exactly its
 * height. The strip plus controls never change height, so the board never
 * changes size or moves when the hint is toggled.
 *
 * Landscape: the controls sit in the side rail beside the board, so the
 * board is unaffected either way; the strip still steps aside so the card
 * fits in the rail on short screens instead of scrolling off the bottom.
 */
export function hintCardChrome({
  hintCardOpen,
  portrait,
  closedControlsHeight,
}: {
  hintCardOpen: boolean;
  portrait: boolean;
  closedControlsHeight: number;
}): { hideReview: boolean; controlsHeight: number | null } {
  if (!hintCardOpen) {
    return { hideReview: false, controlsHeight: null };
  }
  if (!portrait) {
    return { hideReview: true, controlsHeight: null };
  }
  if (closedControlsHeight <= 0) {
    return { hideReview: false, controlsHeight: null };
  }
  return { hideReview: true, controlsHeight: closedControlsHeight + REVIEW_SLOT_HEIGHT };
}
