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
  /**
   * Physical points the player can move from (move hints). Their numbers
   * light up in the rail, outside the board, where no point color can hide
   * them (#265).
   */
  highlighted?: ReadonlySet<number>;
};

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

function NumberCell({ value, width, lit }: { value: number; width: number; lit: boolean }) {
  if (lit) {
    return (
      <View style={[styles.cell, { width }]} testID={`move-hint-${value}`}>
        <Text style={[styles.label, styles.litLabel]}>{value}</Text>
      </View>
    );
  }
  return (
    <Text style={[styles.label, { width }]}>
      {value}
    </Text>
  );
}

function PointHalf({
  points,
  colWidth,
  perspective,
  highlighted,
}: {
  points: number[];
  colWidth: number;
  perspective: Player;
  highlighted?: ReadonlySet<number>;
}) {
  return (
    <View style={styles.half}>
      {points.map(point => (
        <NumberCell
          key={point}
          value={pointNumberLabel(point, perspective)}
          width={colWidth}
          lit={highlighted?.has(point) ?? false}
        />
      ))}
    </View>
  );
}

/** Column-aligned number rail — matches board column widths exactly. */
export function PointNumberRail({ side, dimensions, perspective = 'white', highlighted }: Props) {
  const { colWidth, barWidth, bearOffWidth, boardWidth } = dimensions;
  const left = side === 'top' ? TOP_LEFT : BOT_LEFT;
  const right = side === 'top' ? TOP_RIGHT : BOT_RIGHT;

  return (
    <View style={[styles.rail, { height: POINT_NUMBER_RAIL, width: boardWidth }]}>
      <PointHalf points={left} colWidth={colWidth} perspective={perspective} highlighted={highlighted} />
      <View style={{ width: barWidth }} />
      <PointHalf points={right} colWidth={colWidth} perspective={perspective} highlighted={highlighted} />
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
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  litLabel: {
    minWidth: 20,
    paddingHorizontal: 3,
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#FF9A4C',
    color: '#1E0C02',
    ...interFont('bold'),
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 13,
    color: 'rgba(255, 220, 175, 0.9)',
    ...interFont('semibold'),
  },
});
