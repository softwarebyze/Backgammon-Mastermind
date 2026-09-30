import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { useBoardSlotSize } from '@/features/game/hooks/board-slot-size';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

const BOARD_PADDING = 4;
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
/** Narrower chrome for mini boards (guidance replays) so the points stay readable. */
const COMPACT_BAR_WIDTH = 16;
const COMPACT_BEAR_OFF_WIDTH = 20;
const MIDDLE_HEIGHT = 12;
const BOARD_FRAME_WIDTH = 4;
/**
 * Fallback chrome above/below the board when the leftover slot has not been
 * measured yet (Learn, first layout frame). Header, pip bar, banner, review
 * strip, and dice grow with font size — do not treat this as the live budget.
 */
const WEB_VERTICAL_CHROME = 360;
const NATIVE_VERTICAL_CHROME = 240;
/** Floor when no slot is measured. Measured slots may be shorter. */
const FALLBACK_MIN_OUTER_HEIGHT = 220;
/**
 * Learn lessons keep at least this much leftover for the live board so
 * Point 1–24, the bar, and bear-off stay on screen when coach copy grows.
 */
export const MIN_LEARN_BOARD_SLOT_HEIGHT = FALLBACK_MIN_OUTER_HEIGHT;
/** Always leave a peek of coach copy; overflow scrolls. */
export const MIN_LEARN_CAPTION_HEIGHT = 56;
const DEFAULT_LEFTOVER_FLOOR = 120;

export type BoardDimensions = {
  boardWidth: number;
  boardHeight: number;
  boardFrameWidth: number;
  boardOuterWidth: number;
  boardOuterHeight: number;
  colWidth: number;
  checkerSize: number;
  pointHeight: number;
  barWidth: number;
  bearOffWidth: number;
  middleHeight: number;
};

function dimensionsForWidth(boardOuterWidth: number, compact = false): BoardDimensions {
  const boardWidth = boardOuterWidth - BOARD_FRAME_WIDTH * 2;
  const barWidth = compact ? COMPACT_BAR_WIDTH : BAR_WIDTH;
  const bearOffWidth = compact ? COMPACT_BEAR_OFF_WIDTH : BEAR_OFF_WIDTH;
  const colWidth = (boardWidth - barWidth - bearOffWidth) / 12;
  // Clamp to a minimum so mini boards (e.g. side-by-side guidance replays)
  // never produce negative SVG radii.
  const checkerSize = Math.max(8, Math.min(colWidth - 4, 32));
  const pointHeight = Math.round(Math.min(160, checkerSize * 5.2));
  const boardHeight = pointHeight * 2 + MIDDLE_HEIGHT;
  const boardOuterHeight = boardHeight + BOARD_FRAME_WIDTH * 2;

  return {
    boardWidth,
    boardHeight,
    boardFrameWidth: BOARD_FRAME_WIDTH,
    boardOuterWidth,
    boardOuterHeight,
    colWidth,
    checkerSize,
    pointHeight,
    barWidth,
    bearOffWidth,
    middleHeight: MIDDLE_HEIGHT,
  };
}

export type FitBoardToViewportArgs = {
  maxOuterWidth: number;
  maxOuterHeight: number;
  /** e.g. point-number rails rendered inside the board frame */
  extraHeight?: number;
  /** narrower bar/bear-off for mini boards (guidance replays) */
  compact?: boolean;
};

/**
 * Shrink width until the board (+ optional rails) fits in the available height.
 */
export function fitBoardToViewport({
  maxOuterWidth,
  maxOuterHeight,
  extraHeight = 0,
  compact = false,
}: FitBoardToViewportArgs): BoardDimensions {
  let width = maxOuterWidth;
  let dims = dimensionsForWidth(width, compact);
  // linear shrink — ~40 iterations max; switch to binary search if this gets hot
  while (dims.boardOuterHeight + extraHeight > maxOuterHeight && width > 200) {
    width -= 8;
    dims = dimensionsForWidth(width, compact);
  }
  return dims;
}

/** Move-review strip is a fixed slot in GameScreenLayout. */
export const REVIEW_SLOT_HEIGHT = 68;

export type LeftoverBoardHeightArgs = {
  screenHeight: number;
  headerHeight: number;
  topChromeHeight: number;
  reviewHeight?: number;
  controlsHeight: number;
  bottomInset: number;
  /** Pip, review, and dice sit beside the board — do not subtract them from height. */
  sideBySide?: boolean;
  /** Floor for the leftover slot. Game chrome uses 120; Learn uses MIN_LEARN_BOARD_SLOT_HEIGHT. */
  minHeight?: number;
};

/** Window height minus measured header, pip/banner, review strip, and dice/controls. */
export function leftoverBoardHeight({
  screenHeight,
  headerHeight,
  topChromeHeight,
  reviewHeight = REVIEW_SLOT_HEIGHT,
  controlsHeight,
  bottomInset,
  sideBySide = false,
  minHeight = DEFAULT_LEFTOVER_FLOOR,
}: LeftoverBoardHeightArgs): number {
  const stackedChrome = sideBySide
    ? 0
    : topChromeHeight + reviewHeight + controlsHeight;
  return Math.max(
    minHeight,
    Math.round(
      screenHeight
      - headerHeight
      - stackedChrome
      - bottomInset,
    ),
  );
}

export type LearnCaptionMaxHeightArgs = {
  screenHeight: number;
  headerHeight: number;
  footerHeight: number;
  bottomInset: number;
  minBoardHeight?: number;
};

/**
 * Cap stacked Learn coach copy so the live board keeps `minBoardHeight`.
 * Caption content beyond this scrolls; it does not clip the board.
 */
export function learnCaptionMaxHeight({
  screenHeight,
  headerHeight,
  footerHeight,
  bottomInset,
  minBoardHeight = MIN_LEARN_BOARD_SLOT_HEIGHT,
}: LearnCaptionMaxHeightArgs): number {
  return Math.max(
    MIN_LEARN_CAPTION_HEIGHT,
    Math.round(
      screenHeight
      - headerHeight
      - footerHeight
      - minBoardHeight
      - bottomInset,
    ),
  );
}

export type ResolveBoardViewportArgs = {
  screenWidth: number;
  screenHeight: number;
  platform: 'web' | 'native';
  slotWidth?: number;
  slotHeight?: number;
  extraChrome?: number;
  showPointNumbers?: boolean;
};

/**
 * Size the board to leftover slot height when measured; otherwise window height
 * minus a chrome estimate. Point-number rails count in the height budget.
 */
export function resolveBoardViewport({
  screenWidth,
  screenHeight,
  platform,
  slotWidth,
  slotHeight,
  extraChrome = 0,
  showPointNumbers = true,
}: ResolveBoardViewportArgs): BoardDimensions {
  const hasSlot = (slotWidth ?? 0) > 0 && (slotHeight ?? 0) > 0;
  const chrome = (platform === 'web' ? WEB_VERTICAL_CHROME : NATIVE_VERTICAL_CHROME) + extraChrome;
  const widthBudget = hasSlot ? slotWidth! : screenWidth - BOARD_PADDING * 2;
  const maxOuterWidth = Math.min(widthBudget, MAX_BOARD_WIDTH);
  const maxOuterHeight = hasSlot
    ? slotHeight!
    : Math.max(FALLBACK_MIN_OUTER_HEIGHT, screenHeight - chrome);
  const railHeight = showPointNumbers ? POINT_NUMBER_RAIL * 2 : 0;
  return fitBoardToViewport({ maxOuterWidth, maxOuterHeight, extraHeight: railHeight });
}

export function useBoardDimensions(options?: {
  showPointNumbers?: boolean;
  /** Extra vertical chrome beyond the default game screen estimate. */
  extraChrome?: number;
}): BoardDimensions {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { preferences } = useGamePreferences();
  const slot = useBoardSlotSize();
  const showPointNumbers = options?.showPointNumbers ?? preferences.showPointNumbers;
  const extraChrome = options?.extraChrome ?? 0;
  const platform: 'web' | 'native' = Platform.OS === 'web' ? 'web' : 'native';

  return useMemo(
    () =>
      resolveBoardViewport({
        screenWidth,
        screenHeight,
        platform,
        slotWidth: slot.width,
        slotHeight: slot.height,
        extraChrome,
        showPointNumbers,
      }),
    [screenWidth, screenHeight, platform, slot.width, slot.height, extraChrome, showPointNumbers],
  );
}
