export const SCRIM_PADDING = 24;
export const CARD_MAX_WIDTH = 380;
export const CARD_BORDER = 1.5;
/**
 * Side padding sits inside the card's ScrollView, so the scroll clip edge is
 * the card border, not the edge of the buttons.
 */
export const CARD_GUTTER = 22;

/** Board width that fits the card's content box at this screen width. */
export function guidanceBoardWidth(screenWidth: number) {
  return Math.min(CARD_MAX_WIDTH, screenWidth - SCRIM_PADDING * 2) - CARD_BORDER * 2 - CARD_GUTTER * 2;
}
