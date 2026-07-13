import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const BOARD_PADDING = 4;
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
const MIDDLE_HEIGHT = 12;
const BOARD_FRAME_WIDTH = 4;
const MAX_BOARD_WIDTH = 720;
/** Chrome below/above the board on web (header, pip bar, controls, timeline). */
const WEB_VERTICAL_CHROME = 280;
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

/** Shrink width until the board fits in the available viewport height. */
export function fitBoardToViewport(
  maxOuterWidth: number,
  maxOuterHeight: number,
): BoardDimensions {
  let width = maxOuterWidth;
  let dims = dimensionsForWidth(width);
  // ponytail: O(steps) shrink — ceiling ~40 iterations; upgrade to binary search if needed
  while (dims.boardOuterHeight > maxOuterHeight && width > 200) {
    width -= 8;
    dims = dimensionsForWidth(width);
  }
  return dims;
}

export function useBoardDimensions(): BoardDimensions {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  return useMemo(() => {
    const maxOuterWidth = Math.min(screenWidth - BOARD_PADDING * 2, MAX_BOARD_WIDTH);
    const chrome = Platform.OS === 'web' ? WEB_VERTICAL_CHROME : NATIVE_VERTICAL_CHROME;
    const maxOuterHeight = Math.max(220, screenHeight - chrome);
    return fitBoardToViewport(maxOuterWidth, maxOuterHeight);
  }, [screenWidth, screenHeight]);
}
