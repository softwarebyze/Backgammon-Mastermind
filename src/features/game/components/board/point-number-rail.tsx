import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import { StyleSheet, Text, View } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { pointNumberLabel } from '@/features/game/point-numbering';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  side: 'top' | 'bottom';
  dimensions: BoardDimensions;
  /**
   * Whose point of view the numbers are labeled from. Black's 1-point is
   * physical point 24, so black's labels read 25 - n.
   */
  perspective?: Player;
};

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

type PointLabel = {
  /** Physical point 1–24, fixed regardless of perspective. */
  point: number;
  /** Label shown at that point for the current perspective. */
  value: number;
};

function NumberCell({
  side,
  point,
  value,
  width,
}: PointLabel & { side: 'top' | 'bottom'; width: number }) {
  return (
    <Text
      // The value is part of the id so E2E can assert the label at a fixed
      // physical point when the perspective flips.
      testID={`point-number-${side}-${point}-${value}`}
      style={[styles.label, { width }]}
    >
      {value}
    </Text>
  );
}

function PointHalf({
  side,
  labels,
  colWidth,
}: {
  side: 'top' | 'bottom';
  labels: PointLabel[];
  colWidth: number;
}) {
  return (
    <View style={styles.half}>
      {labels.map(({ point, value }) => (
        <NumberCell
          key={point}
          side={side}
          point={point}
          value={value}
          width={colWidth}
        />
      ))}
    </View>
  );
}

/** Column-aligned number rail — matches board column widths exactly. */
export function PointNumberRail({ side, dimensions, perspective = 'white' }: Props) {
  const { colWidth, barWidth, bearOffWidth, boardWidth } = dimensions;
  const left = side === 'top' ? TOP_LEFT : BOT_LEFT;
  const right = side === 'top' ? TOP_RIGHT : BOT_RIGHT;

  return (
    <View
      testID={`point-number-rail-${side}`}
      style={[styles.rail, { height: POINT_NUMBER_RAIL, width: boardWidth }]}
    >
      <PointHalf
        side={side}
        labels={left.map(point => ({ point, value: pointNumberLabel(point, perspective) }))}
        colWidth={colWidth}
      />
      <View style={{ width: barWidth }} />
      <PointHalf
        side={side}
        labels={right.map(point => ({ point, value: pointNumberLabel(point, perspective) }))}
        colWidth={colWidth}
      />
      <View style={{ width: bearOffWidth }} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  half: {
    flex: 6,
    flexDirection: 'row',
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 13,
    color: 'rgba(255, 220, 175, 0.9)',
    ...interFont('semibold'),
  },
});
