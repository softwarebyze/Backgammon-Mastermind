import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { StyleSheet, Text, View } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  side: 'top' | 'bottom';
  dimensions: BoardDimensions;
};

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

function NumberCell({ value, width }: { value: number; width: number }) {
  return (
    <Text style={[styles.label, { width }]}>
      {value}
    </Text>
  );
}

function PointHalf({ indices, colWidth }: { indices: number[]; colWidth: number }) {
  return (
    <View style={styles.half}>
      {indices.map(value => (
        <NumberCell key={value} value={value} width={colWidth} />
      ))}
    </View>
  );
}

/** Column-aligned number rail — matches board column widths exactly. */
export function PointNumberRail({ side, dimensions }: Props) {
  const { colWidth, barWidth, bearOffWidth, boardWidth } = dimensions;
  const left = side === 'top' ? TOP_LEFT : BOT_LEFT;
  const right = side === 'top' ? TOP_RIGHT : BOT_RIGHT;

  return (
    <View style={[styles.rail, { height: POINT_NUMBER_RAIL, width: boardWidth }]}>
      <PointHalf indices={left} colWidth={colWidth} />
      <View style={{ width: barWidth }} />
      <PointHalf indices={right} colWidth={colWidth} />
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
    fontSize: 10,
    lineHeight: 12,
    color: 'rgba(255, 220, 175, 0.9)',
    ...interFont('semibold'),
  },
});
