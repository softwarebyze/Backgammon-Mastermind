/** Phone-like column for pip bar, Learn lists, and other game chrome. */
export const GAME_CHROME_MAX_WIDTH = 480;

/**
 * Board never grows past this. Wrap the playing surface to the same cap so
 * wide-web brown flanks sit outside the stage, not inside a 100% board wrap.
 */
export const MAX_BOARD_WIDTH = 720;

/** Minimum width for dice / coach / review when they sit beside the board. */
const LANDSCAPE_CHROME_MIN = 220;

/**
 * True when the window is wider than it is tall (phone landscape, tablet
 * landscape, desktop). Stacked chrome would starve board height.
 */
export function isLandscapeLayout(width: number, height: number): boolean {
  return width > height;
}

/**
 * Side chrome column in landscape. Share of width, not a vertical 360px estimate.
 * Leaves most of the short axis for the board.
 */
export function landscapeChromeColumnWidth(screenWidth: number): number {
  const byShare = Math.round(screenWidth * 0.36);
  return Math.min(GAME_CHROME_MAX_WIDTH, Math.max(LANDSCAPE_CHROME_MIN, byShare));
}
