import type { BoardPointData } from '../brand/initial-board';

import type { BoardLayout } from '../lib/board-layout';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { getColumnSlot } from '../lib/board-layout';
import { CheckerPiece } from './checker-piece';

const MAX_VISIBLE = 5;

type Props = {
  points: BoardPointData[];
  layout: BoardLayout;
  animateCheckers: boolean;
  showMoveHintOn: number | null;
};

export function BoardCheckersLayer({
  points,
  layout,
  animateCheckers,
  showMoveHintOn,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const checkers = [];

  for (let pointIndex = 1; pointIndex <= 24; pointIndex++) {
    const point = points[pointIndex];
    if (!point?.player || point.count === 0) {
      continue;
    }

    const slot = getColumnSlot(pointIndex, layout);
    if (!slot) {
      continue;
    }

    const visible = Math.min(point.count, MAX_VISIBLE);
    const stackStep = Math.min(
      layout.checkerSize - 2,
      (layout.pointHeight - layout.checkerSize) / (MAX_VISIBLE - 1),
    );

    for (let i = 0; i < visible; i++) {
      const delay = pointIndex * 1.5 + i * 0.8;
      const checkerSpring = animateCheckers
        ? spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, stiffness: 120 },
          })
        : 1;

      const offset = i * stackStep;
      const cx = slot.x + slot.colWidth / 2;
      const cy = slot.isTop
        ? slot.y + layout.checkerSize / 2 + offset
        : slot.y + slot.pointHeight - layout.checkerSize / 2 - offset;

      const isTopChecker = i === visible - 1;
      const showHint = showMoveHintOn === pointIndex && isTopChecker;

      checkers.push(
        <g
          key={`p${pointIndex}-c${i}`}
          transform={`translate(${cx - layout.checkerSize / 2}, ${cy - layout.checkerSize / 2}) scale(${checkerSpring})`}
          opacity={checkerSpring}
        >
          <CheckerPiece
            player={point.player as 'white' | 'black'}
            size={layout.checkerSize}
            showHint={showHint}
          />
        </g>,
      );
    }
  }

  return <>{checkers}</>;
}
