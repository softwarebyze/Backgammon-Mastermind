/** Review / undo / redo scrub — snappy but visible on 60fps displays. */
export const REVIEW_CHECKER_MOVE_DURATION_MS = 300;

export type ReviewNavPlan
  = { mode: 'live' }
    | { mode: 'noop' }
    | { mode: 'jump'; ply: number }
    | { mode: 'step'; ply: number; direction: 'forward' | 'backward' };

export function planReviewNavigation(
  currentPly: number,
  targetPly: number,
  liveIndex: number,
): ReviewNavPlan {
  if (targetPly > liveIndex) {
    return { mode: 'live' };
  }
  if (targetPly === currentPly) {
    return { mode: 'noop' };
  }
  const diff = targetPly - currentPly;
  if (Math.abs(diff) === 1) {
    return {
      mode: 'step',
      ply: targetPly,
      direction: diff > 0 ? 'forward' : 'backward',
    };
  }
  // Instant settle — fading the whole board felt like a flicker.
  return { mode: 'jump', ply: targetPly };
}

/** Scrubber highlight follows the board, not the in-flight animation target. */
export function reviewScrubberPly(
  viewIndex: number,
  pendingAnimTarget: number | null,
  pendingDirection: 'forward' | 'backward' | null,
): number {
  if (pendingAnimTarget === null || pendingDirection === null) {
    return viewIndex;
  }
  return pendingDirection === 'forward' ? pendingAnimTarget - 1 : pendingAnimTarget + 1;
}
