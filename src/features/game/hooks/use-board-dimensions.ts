import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

const BOARD_PADDING = 4;
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
const MIDDLE_HEIGHT = 12;
const BOARD_FRAME_WIDTH = 4;
/**
 * Chrome above/below the board on web (stack header, pip bar, turn banner,
 * review strip, controls). Tuned so common desktop viewports keep the board
 * fully on-screen instead of overflowing.
 */
const WEB_VERTICAL_CHROME = 360;
const NATIVE_VERTICAL_CHROME = 240;

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

export function useBoardDimensions(options?: {
  showPointNumbers?: boolean;
  /** Extra vertical chrome beyond the default game screen estimate. */
  extraChrome?: number;
}): BoardDimensions {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { preferences } = useGamePreferences();
  const showPointNumbers = options?.showPointNumbers ?? preferences.showPointNumbers;
  const extraChrome = options?.extraChrome ?? 0;

  return useMemo(() => {
    const maxOuterWidth = Math.min(screenWidth - BOARD_PADDING * 2, MAX_BOARD_WIDTH);
    const chrome = (Platform.OS === 'web' ? WEB_VERTICAL_CHROME : NATIVE_VERTICAL_CHROME) + extraChrome;
    const railHeight = showPointNumbers ? POINT_NUMBER_RAIL * 2 : 0;
    const maxOuterHeight = Math.max(220, screenHeight - chrome);
    return fitBoardToViewport(maxOuterWidth, maxOuterHeight, railHeight);
  }, [screenWidth, screenHeight, showPointNumbers, extraChrome]);
}
