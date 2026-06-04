import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const BOARD_PADDING = 4;
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
const MIDDLE_HEIGHT = 12;
const MAX_BOARD_WIDTH = 720;

export type BoardDimensions = {
  boardWidth: number;
  boardHeight: number;
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
    const boardWidth = Math.min(screenWidth - BOARD_PADDING * 2, MAX_BOARD_WIDTH);
    const colWidth = (boardWidth - BAR_WIDTH - BEAR_OFF_WIDTH) / 12;
    const checkerSize = Math.min(colWidth - 4, 32);
    const pointHeight = Math.round(Math.min(160, checkerSize * 5.2));
    const boardHeight = pointHeight * 2 + MIDDLE_HEIGHT;

    return {
      boardWidth,
      boardHeight,
      colWidth,
      checkerSize,
      pointHeight,
      barWidth: BAR_WIDTH,
      bearOffWidth: BEAR_OFF_WIDTH,
      middleHeight: MIDDLE_HEIGHT,
    };
  }, [screenWidth]);
}
