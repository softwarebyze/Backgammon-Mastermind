import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';

/**
 * Playing-surface origin inside BoardView's outer frame (frame border plus
 * the optional top point-number rail). Move-path overlays draw in
 * surface-local coordinates, so they must be absolutely positioned at this
 * offset within BoardView — not at (0, 0). (game-board-section got this
 * right; the guidance replay boards didn't, so their arrows drifted
 * whenever point numbers were showing.)
 */
export function playingSurfaceOffset(boardFrameWidth: number, showPointNumbers: boolean) {
  return {
    left: boardFrameWidth,
    top: boardFrameWidth + (showPointNumbers ? POINT_NUMBER_RAIL : 0),
  };
}

/** Full BoardView height including the frame and optional top/bottom number rails. */
export function boardViewHeight(boardOuterHeight: number, showPointNumbers: boolean) {
  return boardOuterHeight + (showPointNumbers ? POINT_NUMBER_RAIL * 2 : 0);
}

/** Extra height to pass as fitBoardToViewport's extraHeight for the rails. */
export function pointNumberRailsHeight(showPointNumbers: boolean) {
  return showPointNumbers ? POINT_NUMBER_RAIL * 2 : 0;
}
