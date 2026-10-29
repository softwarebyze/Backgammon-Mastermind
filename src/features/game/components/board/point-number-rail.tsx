import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState, Player } from '@/lib/game/types';
import { StyleSheet, Text, View } from 'react-native';

import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { pointNumberLabel } from '@/features/game/point-numbering';
import { calculatePipCount } from '@/lib/game';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  side: 'top' | 'bottom';
  state?: GameState;
  showNumbers?: boolean;
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
export function PointNumberRail({ side, dimensions, perspective = 'white', state, showNumbers = true }: Props) {
  const { colWidth, barWidth, bearOffWidth, boardWidth } = dimensions;
  const player = side === 'top' ? 'black' : 'white';
  const left = side === 'top' ? TOP_LEFT : BOT_LEFT;
  const right = side === 'top' ? TOP_RIGHT : BOT_RIGHT;

  return (
    <View style={[styles.rail, { height: POINT_NUMBER_RAIL, width: boardWidth }]}>
      <PointHalf indices={showNumbers ? left.map(n => pointNumberLabel(n, perspective)) : []} colWidth={colWidth} />
      <View style={{ width: barWidth }} />
      <PointHalf indices={showNumbers ? right.map(n => pointNumberLabel(n, perspective)) : []} colWidth={colWidth} />
      <View style={{ width: bearOffWidth, alignItems: 'center' }}>
        {state && <Text testID={`pip-count-${player}`} style={[styles.label, { color: player === 'white' ? '#F5F0E8' : '#E8B580' }]} accessibilityLabel={translate('game.status.pips_a11y', { player: translate(`game.review.player_${player}`), pips: calculatePipCount(state, player), off: state.borneOff[player] })}>{calculatePipCount(state, player)}</Text>}
      </View>
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
