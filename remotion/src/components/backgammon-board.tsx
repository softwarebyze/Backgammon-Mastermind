import type { BoardPointData } from '../brand/initial-board';

import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { INITIAL_POINTS } from '../brand/initial-board';
import { computeBoardLayout, fitBoardWidth } from '../lib/board-layout';
import { BoardFrameSvg } from './board-frame-svg';

type Props = {
  width?: number;
  /** 0–1 of video width when width omitted */
  widthRatio?: number;
  maxHeightRatio?: number;
  animateEntrance?: boolean;
  animateCheckers?: boolean;
  points?: BoardPointData[];
  legalPoints?: number[];
  highlightPoints?: number[];
  showMoveHintOn?: number;
};

export const BackgammonBoard: React.FC<Props> = ({
  width,
  widthRatio = 0.9,
  maxHeightRatio = 0.52,
  animateEntrance = true,
  animateCheckers = true,
  points = INITIAL_POINTS,
  legalPoints = [],
  highlightPoints = [],
  showMoveHintOn = null,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();

  const boardWidth = width ?? fitBoardWidth({
    videoWidth,
    videoHeight,
    maxWidthRatio: widthRatio,
    maxHeightRatio,
  });
  const layout = computeBoardLayout(boardWidth);

  const entrance = animateEntrance
    ? spring({ frame, fps, config: { damping: 18, stiffness: 80 } })
    : 1;
  const boardScale = interpolate(entrance, [0, 1], [0.92, 1]);
  const boardOpacity = interpolate(entrance, [0, 1], [0, 1]);

  const legalSet = new Set(legalPoints);
  const highlightSet = new Set(highlightPoints);

  return (
    <div
      style={{
        transform: `scale(${boardScale})`,
        opacity: boardOpacity,
        filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.55))',
      }}
    >
      <BoardFrameSvg
        layout={layout}
        points={points}
        legalSet={legalSet}
        highlightSet={highlightSet}
        animateCheckers={animateCheckers}
        showMoveHintOn={showMoveHintOn}
      />
    </div>
  );
};
