/**
 * Visual-only lift so the floating checker sits above the fingertip.
 * Drop targeting still uses raw finger board coords — do not apply this there.
 */
export function dragOverlayFingerLift(checkerSize: number): number {
  return Math.round(checkerSize * 0.9);
}

/** Board-local center matching the floating overlay when the finger releases. */
export function dragReleaseAnchor(
  boardX: number,
  boardY: number,
  checkerSize: number,
): { x: number; y: number } {
  return {
    x: boardX,
    y: boardY - dragOverlayFingerLift(checkerSize),
  };
}
