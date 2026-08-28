import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { useBoardSlotSize } from '@/features/game/hooks/board-slot-size';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

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

function dimensionsForWidth(boardOuterWidth: number): BoardDimensions {
  const boardWidth = boardOuterWidth - BOARD_FRAME_WIDTH * 2;
  const colWidth = (boardWidth - BAR_WIDTH - BEAR_OFF_WIDTH) / 12;
  const checkerSize = Math.min(colWidth - 4, 32);
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
  let width = maxOuterWidth;
  let dims = dimensionsForWidth(width);
  // linear shrink — ~40 iterations max; switch to binary search if this gets hot
  while (dims.boardOuterHeight + extraHeight > maxOuterHeight && width > 200) {
    width -= 8;
    dims = dimensionsForWidth(width);
  }
  return dims;
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
  return fitBoardToViewport(maxOuterWidth, maxOuterHeight, railHeight);
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
