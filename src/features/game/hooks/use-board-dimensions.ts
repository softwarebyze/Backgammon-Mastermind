import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const BOARD_PADDING = 4;
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
const MIDDLE_HEIGHT = 12;
const BOARD_FRAME_WIDTH = 4;
const MAX_BOARD_WIDTH = 720;

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

export function useBoardDimensions(): BoardDimensions {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => {
    const boardOuterWidth = Math.min(screenWidth - BOARD_PADDING * 2, MAX_BOARD_WIDTH);
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
  }, [screenWidth]);
}
