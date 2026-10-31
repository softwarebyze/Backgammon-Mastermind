/**
 * Width "BACKGAMMON" needs at 32 pt with 4 pt tracking. Web measures ~288;
 * Android draws it wider, so this keeps a margin for both.
 */
const WIDEST_WORD_AT_32 = 330;

/** How much to shrink the title so its widest word fits `available` points. */
export function homeTitleScale(available: number, fontSize: number): number {
  const needed = WIDEST_WORD_AT_32 * (fontSize / 32);
  return Math.min(1, Math.max(0.6, available / needed));
}
