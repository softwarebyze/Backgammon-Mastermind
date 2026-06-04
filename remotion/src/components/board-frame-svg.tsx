import type { BoardPointData } from '../brand/initial-board';
import type { PointState } from '../brand/palette';
import type { BoardLayout } from '../lib/board-layout';
import { BOARD, getPointColors } from '../brand/palette';
import { getColumnSlot } from '../lib/board-layout';
import { BoardCheckersLayer } from './board-checkers-layer';

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

function PointTriangle({
  x,
  y,
  colWidth,
  pointHeight,
  isTop,
  pointIndex,
  state,
}: {
  x: number;
  y: number;
  colWidth: number;
  pointHeight: number;
  isTop: boolean;
  pointIndex: number;
  state: PointState;
}) {
  const palette = getPointColors(pointIndex, state);
  const points = isTop
    ? `${x},${y} ${x + colWidth},${y} ${x + colWidth / 2},${y + pointHeight}`
    : `${x},${y + pointHeight} ${x + colWidth},${y + pointHeight} ${x + colWidth / 2},${y}`;

  return (
    <polygon
      points={points}
      fill={palette.fill}
      stroke={palette.stroke}
      strokeWidth={0.75}
    />
  );
}

function PointColumns({
  indices,
  isTop,
  layout,
  legalSet,
  highlightSet,
}: {
  indices: number[];
  isTop: boolean;
  layout: BoardLayout;
  legalSet: Set<number>;
  highlightSet: Set<number>;
}) {
  return indices.map((pointIndex) => {
    const slot = getColumnSlot(pointIndex, layout);
    if (!slot) {
      return null;
    }
    let state: PointState = 'default';
    if (highlightSet.has(pointIndex)) {
      state = 'selected';
    }
    else if (legalSet.has(pointIndex)) {
      state = 'legal';
    }
    return (
      <PointTriangle
        key={pointIndex}
        x={slot.x}
        y={slot.y}
        colWidth={slot.colWidth}
        pointHeight={slot.pointHeight}
        isTop={isTop}
        pointIndex={pointIndex}
        state={state}
      />
    );
  });
}

type FrameProps = {
  layout: BoardLayout;
  points: BoardPointData[];
  legalSet: Set<number>;
  highlightSet: Set<number>;
  animateCheckers: boolean;
  showMoveHintOn: number | null;
};

export function BoardFrameSvg({
  layout,
  points,
  legalSet,
  highlightSet,
  animateCheckers,
  showMoveHintOn,
}: FrameProps) {
  const { boardWidth, boardHeight, padding, barWidth, bearOffWidth, middleHeight } = layout;
  const leftWidth = layout.colWidth * 6;
  const barX = padding + leftWidth;
  const bearOffX = barX + barWidth;
  const half = (boardHeight - middleHeight) / 2;
  const totalWidth = boardWidth + padding * 2;
  const totalHeight = boardHeight + padding * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth}
      height={totalHeight}
      style={{ display: 'block' }}
    >
      <rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalHeight}
        rx={10}
        fill={BOARD.frame.outer}
        stroke={BOARD.frame.rim}
        strokeWidth={4}
      />
      <rect
        x={padding}
        y={padding}
        width={boardWidth}
        height={boardHeight}
        rx={6}
        fill={BOARD.wood.base}
      />

      <PointColumns indices={TOP_LEFT} isTop layout={layout} legalSet={legalSet} highlightSet={highlightSet} />
      <PointColumns indices={BOT_LEFT} isTop={false} layout={layout} legalSet={legalSet} highlightSet={highlightSet} />
      <PointColumns indices={TOP_RIGHT} isTop layout={layout} legalSet={legalSet} highlightSet={highlightSet} />
      <PointColumns indices={BOT_RIGHT} isTop={false} layout={layout} legalSet={legalSet} highlightSet={highlightSet} />

      <rect x={barX} y={padding} width={barWidth} height={boardHeight} fill={BOARD.bar.surface} />
      <rect
        x={barX}
        y={padding + half}
        width={barWidth}
        height={middleHeight}
        fill={BOARD.bar.groove}
      />
      <rect
        x={barX + barWidth * 0.15}
        y={padding + half + 1}
        width={barWidth * 0.7}
        height={middleHeight - 2}
        rx={1}
        fill={BOARD.bar.hinge}
      />

      <rect
        x={bearOffX}
        y={padding}
        width={bearOffWidth}
        height={boardHeight}
        fill={BOARD.bearOff.surface}
        stroke={BOARD.bearOff.border}
        strokeWidth={1}
      />
      <rect
        x={bearOffX}
        y={padding + half}
        width={bearOffWidth}
        height={middleHeight}
        fill={BOARD.bar.groove}
      />
      <text
        x={bearOffX + bearOffWidth / 2}
        y={padding + half / 2 + 4}
        textAnchor="middle"
        fill="#A08060"
        fontSize={7}
        fontFamily="Inter, sans-serif"
      >
        off
      </text>
      <text
        x={bearOffX + bearOffWidth / 2}
        y={padding + half + middleHeight + half / 2 + 4}
        textAnchor="middle"
        fill="#A08060"
        fontSize={7}
        fontFamily="Inter, sans-serif"
      >
        off
      </text>

      <BoardCheckersLayer
        points={points}
        layout={layout}
        animateCheckers={animateCheckers}
        showMoveHintOn={showMoveHintOn}
      />
    </svg>
  );
}
