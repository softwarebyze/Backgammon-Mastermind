/** Phone-like column for pip bar, Learn lists, and other game chrome. */
export const GAME_CHROME_MAX_WIDTH = 480;

/**
 * Board never grows past this on phones and tablets. Wrap the playing surface
 * to the same cap so wide-web brown flanks sit outside the stage, not inside
 * a 100% board wrap.
 */
export const MAX_BOARD_WIDTH = 720;

/** Desktop / wide windows: the board may use the height it has. */
export const DESKTOP_MAX_BOARD_WIDTH = 1000;

/** Checker diameter caps: 32 keeps phone/tablet pixel-identical; desktop may go to 48. */
export const CHECKER_CAP = 32;
export const DESKTOP_CHECKER_CAP = 48;

/** Desktop / macOS window — board+chrome sit in a centered stage. */
export const DESKTOP_MIN_WIDTH = 1024;

/** Centered home / Learn-hub stage on tablet landscape and desktop. */
export const PAGE_STAGE_MAX_WIDTH = 1120;

/** Settings and forms — readable column, not full-bleed on wide windows. */
export const SETTINGS_MAX_WIDTH = 640;

/** Minimum width for dice / coach / review when they sit beside the board. */
const LANDSCAPE_CHROME_MIN = 220;

/** Gap between the board pane and the chrome rail in landscape. */
export const LANDSCAPE_GAP = 8;

/**
 * Desktop chrome rail cap. Phone landscape may use up to GAME_CHROME_MAX_WIDTH
 * (36% of 844 ≈ 304). Uncapped 36% of 1920 is 691px of empty rail.
 */
const DESKTOP_CHROME_MAX = 360;

/**
 * True when the window is wider than it is tall (phone landscape, tablet
 * landscape, desktop). Stacked chrome would starve board height.
 */
export function isLandscapeLayout(width: number, height: number): boolean {
  return width > height;
}

/** True on desktop web and wide macOS / iPad landscape windows. */
export function isDesktopLayout(width: number): boolean {
  return width >= DESKTOP_MIN_WIDTH;
}

/** Widest the board may be for this window. */
export function boardMaxWidth(innerWidth: number): number {
  return isDesktopLayout(innerWidth) ? DESKTOP_MAX_BOARD_WIDTH : MAX_BOARD_WIDTH;
}

/** Largest checker the board may draw for this window. */
export function checkerCap(innerWidth: number): number {
  return isDesktopLayout(innerWidth) ? DESKTOP_CHECKER_CAP : CHECKER_CAP;
}

/**
 * Side chrome column in landscape. Share of width, not a vertical 360px estimate.
 * Leaves most of the short axis for the board. Caps tighter on desktop so the
 * rail stays next to the board instead of hugging the far edge.
 */
export function landscapeChromeColumnWidth(screenWidth: number): number {
  const cap = screenWidth >= DESKTOP_MIN_WIDTH ? DESKTOP_CHROME_MAX : GAME_CHROME_MAX_WIDTH;
  const byShare = Math.round(screenWidth * 0.36);
  return Math.min(cap, Math.max(LANDSCAPE_CHROME_MIN, byShare));
}

/**
 * Max width of the board + chrome row. `undefined` on phones so the row
 * fills the short landscape axis. Desktop gets balanced side margins.
 */
export function gameStageMaxWidth(screenWidth: number): number | undefined {
  if (screenWidth < DESKTOP_MIN_WIDTH) {
    return undefined;
  }
  return boardMaxWidth(screenWidth) + LANDSCAPE_GAP + landscapeChromeColumnWidth(screenWidth);
}

/** Explicit board pane in landscape so flex min-width cannot overflow the chrome rail. */
export function landscapeBoardPaneWidth(innerWidth: number, chromeWidth: number): number {
  return Math.min(boardMaxWidth(innerWidth), Math.max(200, innerWidth - chromeWidth - LANDSCAPE_GAP));
}
