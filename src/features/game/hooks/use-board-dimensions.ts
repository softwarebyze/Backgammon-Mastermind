import { useMemo } from 'react';
import { Platform } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { useBoardSlotSize } from '@/features/game/hooks/board-slot-size';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';
import { useLayoutMetrics } from '@/lib/ui/layout-metrics';

const BOARD_PADDING = 4;
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
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

/**
 * Point length in checker diameters. 5.2 is the compact floor (five checkers
 * just fit). Up to 8, points stretch to use leftover height — phone portrait
 * used to leave ~40% of the slot empty around a squat board.
 */
const MIN_POINT_CHECKERS = 5.2;
const MAX_POINT_CHECKERS = 7;

/** When `maxOuterHeight` is given, points grow toward it (never past MAX_POINT_CHECKERS). */
function dimensionsForWidth(boardOuterWidth: number, maxOuterHeight = 0): BoardDimensions {
  const boardWidth = boardOuterWidth - BOARD_FRAME_WIDTH * 2;
  const colWidth = (boardWidth - BAR_WIDTH - BEAR_OFF_WIDTH) / 12;
  const checkerSize = Math.min(colWidth - 4, 32);
  const minPoint = Math.round(checkerSize * MIN_POINT_CHECKERS);
  const roomFor = Math.floor((maxOuterHeight - BOARD_FRAME_WIDTH * 2 - MIDDLE_HEIGHT) / 2);
  const pointHeight = Math.max(
    minPoint,
    Math.min(Math.round(checkerSize * MAX_POINT_CHECKERS), roomFor),
  );
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
    barWidth: BAR_WIDTH,
    bearOffWidth: BEAR_OFF_WIDTH,
    middleHeight: MIDDLE_HEIGHT,
  };
}

/**
 * Shrink width until the board (+ optional rails) fits in the available height.
 * @param maxOuterWidth — max board outer width for the viewport
 * @param maxOuterHeight — max board outer height for the viewport
 * @param extraHeight — e.g. point-number rails rendered inside the board frame
 */
export function fitBoardToViewport(
  maxOuterWidth: number,
  maxOuterHeight: number,
  extraHeight = 0,
): BoardDimensions {
  const innerHeight = maxOuterHeight - extraHeight;
  let width = maxOuterWidth;
  let dims = dimensionsForWidth(width, innerHeight);
  // linear shrink — ~40 iterations max; switch to binary search if this gets hot
  while (dims.boardOuterHeight + extraHeight > maxOuterHeight && width > 200) {
    width -= 8;
    dims = dimensionsForWidth(width, innerHeight);
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
  /** Left + right safe-area insets; ignored once a slot is measured. */
  horizontalInset?: number;
  /** Landscape pane cap so the board cannot be 720px on a short phone. */
  maxOuterWidthCap?: number;
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
  horizontalInset = 0,
  maxOuterWidthCap,
}: ResolveBoardViewportArgs): BoardDimensions {
  const hasSlot = (slotWidth ?? 0) > 0 && (slotHeight ?? 0) > 0;
  const chrome = (platform === 'web' ? WEB_VERTICAL_CHROME : NATIVE_VERTICAL_CHROME) + extraChrome;
  const widthBudget = hasSlot
    ? slotWidth!
    : screenWidth - BOARD_PADDING * 2 - horizontalInset;
  const maxOuterWidth = Math.min(
    widthBudget,
    MAX_BOARD_WIDTH,
    maxOuterWidthCap ?? Number.POSITIVE_INFINITY,
  );
  const maxOuterHeight = hasSlot
    ? slotHeight!
    : Math.max(FALLBACK_MIN_OUTER_HEIGHT, screenHeight - chrome);
  const railHeight = showPointNumbers ? POINT_NUMBER_RAIL * 2 : 0;
  return fitBoardToViewport(maxOuterWidth, maxOuterHeight, railHeight);
}

export function useBoardDimensions(options?: {
  showPointNumbers?: boolean;
  /** Extra vertical chrome beyond the default game screen estimate. */
  extraChrome?: number;
}): BoardDimensions {
  const {
    width: screenWidth,
    height: screenHeight,
    insets,
    boardPaneWidth: maxOuterWidthCap,
  } = useLayoutMetrics();
  const { preferences } = useGamePreferences();
  const slot = useBoardSlotSize();
  const showPointNumbers = options?.showPointNumbers ?? preferences.showPointNumbers;
  const extraChrome = options?.extraChrome ?? 0;
  const platform: 'web' | 'native' = Platform.OS === 'web' ? 'web' : 'native';
  const horizontalInset = insets.left + insets.right;

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
        horizontalInset,
        maxOuterWidthCap,
      }),
    [
      screenWidth,
      screenHeight,
      platform,
      slot.width,
      slot.height,
      extraChrome,
      showPointNumbers,
      horizontalInset,
      maxOuterWidthCap,
    ],
  );
}
