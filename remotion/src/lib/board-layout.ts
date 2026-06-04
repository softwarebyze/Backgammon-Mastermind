/** Proportions aligned with src/features/game/hooks/use-board-dimensions.ts */
const BAR_WIDTH = 28;
const BEAR_OFF_WIDTH = 38;
const MIDDLE_HEIGHT = 12;
const REF_WIDTH = 680;

export type BoardLayout = {
  boardWidth: number;
  boardHeight: number;
  colWidth: number;
  checkerSize: number;
  pointHeight: number;
  barWidth: number;
  bearOffWidth: number;
  middleHeight: number;
  padding: number;
};

export function computeBoardLayout(targetWidth: number): BoardLayout {
  const boardWidth = targetWidth;
  const colWidth = (boardWidth - BAR_WIDTH - BEAR_OFF_WIDTH) / 12;
  const checkerSize = Math.min(colWidth - 4, Math.round(32 * (boardWidth / REF_WIDTH)));
  const pointHeight = Math.round(Math.min(160 * (boardWidth / REF_WIDTH), checkerSize * 5.2));
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
    padding: 4,
  };
}

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

export type ColumnSlot = {
  x: number;
  y: number;
  colWidth: number;
  pointHeight: number;
  isTop: boolean;
};

export function getColumnSlot(
  pointIndex: number,
  layout: BoardLayout,
): ColumnSlot | null {
  const { colWidth, pointHeight, barWidth, padding, boardHeight, middleHeight } = layout;
  const half = (boardHeight - middleHeight) / 2;
  const leftWidth = colWidth * 6;

  const slot = (col: number, isTop: boolean, side: 'left' | 'right'): ColumnSlot => {
    const x
      = side === 'left'
        ? padding + col * colWidth
        : padding + leftWidth + barWidth + col * colWidth;
    const y = isTop ? padding : padding + half + middleHeight;
    return { x, y, colWidth, pointHeight, isTop };
  };

  const leftTop = TOP_LEFT.indexOf(pointIndex);
  if (leftTop >= 0) {
    return slot(leftTop, true, 'left');
  }
  const leftBot = BOT_LEFT.indexOf(pointIndex);
  if (leftBot >= 0) {
    return slot(leftBot, false, 'left');
  }
  const rightTop = TOP_RIGHT.indexOf(pointIndex);
  if (rightTop >= 0) {
    return slot(rightTop, true, 'right');
  }
  const rightBot = BOT_RIGHT.indexOf(pointIndex);
  if (rightBot >= 0) {
    return slot(rightBot, false, 'right');
  }
  return null;
}

export type FitBoardWidthOptions = {
  videoWidth: number;
  videoHeight: number;
  maxWidthRatio?: number;
  maxHeightRatio?: number;
};

export function fitBoardWidth({
  videoWidth,
  videoHeight,
  maxWidthRatio = 0.92,
  maxHeightRatio = 0.55,
}: FitBoardWidthOptions): number {
  const maxW = videoWidth * maxWidthRatio;
  const layoutAtMax = computeBoardLayout(maxW);
  const maxH = videoHeight * maxHeightRatio;
  if (layoutAtMax.boardHeight <= maxH) {
    return maxW;
  }
  const scale = maxH / layoutAtMax.boardHeight;
  return maxW * scale;
}
