import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { editCheckers, newPosition } from '@/lib/positions/position';
import { positionControlAnchor } from './position-control-anchor';
import { PositionAction } from './position-controls';
import { styles } from './position-styles';

/** Contextual controls stay outside the board, beside the selected stack. */
export function PositionEditor({ position: p, location, color, dimensions, onChange }: {
  position: Position;
  location: PositionLocation;
  color: Player;
  dimensions: BoardDimensions;
  onChange: (p: Position) => void;
}) {
  const owner = typeof location === 'string' ? location === 'white-bar' ? 'white' : 'black' : p.points[location]!.player;
  const side = owner ?? color;
  const count = typeof location === 'number' ? p.points[location]!.count : p.bar[side];
  const edit = (delta: number) => {
    const edited = editCheckers({ ...p, dice: [0, 0], context: newPosition().context }, location, side, delta);
    onChange({ ...edited, dice: p.dice, context: p.context });
  };
  return (
    <View testID="position-point-controls" style={[styles.pointControls, { left: positionControlAnchor(location, dimensions).left }]}>
      <Text testID="position-selected" style={styles.pointControlLabel}>{typeof location === 'number' ? translate('positions.point_short', { point: location, count }) : `${translate(`positions.${side}_bar`)} · ${count}`}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <PositionAction symbol="minus" iconOnly label={translate('positions.remove')} testID="position-remove" disabled={!count} onPress={() => edit(-1)} />
        <PositionAction symbol="x" iconOnly label={translate('positions.empty_point')} testID="position-empty-point" disabled={!count} onPress={() => edit(-count)} />
        <PositionAction symbol="plus" iconOnly label={translate('positions.add')} testID="position-add" disabled={!p.borneOff[side]} onPress={() => edit(1)} />
      </View>
    </View>
  );
}
