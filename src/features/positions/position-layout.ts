/** Header and the page's own top and bottom padding. */
const CHROME_HEIGHT = 64 + 12 + 32;
/** The two player strips and their gaps. */
const STRIPS_HEIGHT = 56 * 2 + 8 * 2;
/** The paint/setup row above the board, when it is not in the side panel. */
const TOOLBAR_HEIGHT = 48 + 8;
/** Scoreboard, actions and their gaps when they sit under the board. */
const BELOW_BOARD_HEIGHT = 150 + 44 + 12 * 2;
/** Controls beside the board on wide or short screens (landscape phones, desktop, zoomed-in browsers). */
const SIDE_PANEL_WIDTH = 320;
/** Landscape phones: a slimmer panel leaves the board more room. */
const NARROW_SIDE_PANEL_WIDTH = 280;
export const SIDE_GAP = 24;

/**
 * Fit the board to what is left of the window once everything else has its
 * room, so zooming the browser in or out never pushes Play off screen. Wide
 * or short windows put the controls beside the board instead of under it.
 */
export function positionLayout(width: number, height: number, horizontalInsets: number) {
  const side = width >= 720 && width > height * 1.2;
  const panelWidth = width < 1000 ? NARROW_SIDE_PANEL_WIDTH : SIDE_PANEL_WIDTH;
  const boardWidth = width - 32 - horizontalInsets - (side ? panelWidth + SIDE_GAP : 0);
  // Beside the board, the panel also holds the player strips: the board gets the full height.
  const boardHeight = height - CHROME_HEIGHT - (side ? 0 : STRIPS_HEIGHT + TOOLBAR_HEIGHT + BELOW_BOARD_HEIGHT);
  // Never wider than the column: a large browser zoom can leave very little room.
  const fittedWidth = Math.min(1200, Math.max(120, boardWidth));
  // Small phones scroll a little rather than shrink the board below a usable size.
  const minHeight = side ? 180 : fittedWidth * 0.75;
  return { side, panelWidth, boardWidth: fittedWidth, boardHeight: Math.max(minHeight, boardHeight) };
}
