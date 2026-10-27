import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { editCheckers, newPosition } from '@/lib/positions/position';
import { PositionAction } from './position-controls';
import { styles } from './position-styles';

export function PositionEditor({ position: p, location, color, onLocation, onChange }: {
  position: Position;
  location: PositionLocation | null;
  color: Player;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (p: Position) => void;
}) {
  const owner = typeof location === 'string' ? location === 'white-bar' ? 'white' : 'black' : location ? p.points[location]!.player : null;
  const side = owner ?? color;
  const edit = (delta: number) => {
    if (location !== null) {
      const edited = editCheckers({ ...p, dice: [0, 0], context: newPosition().context }, location, side, delta);
      onChange({ ...edited, dice: p.dice, context: p.context });
    }
  };
  const count = typeof location === 'number' ? p.points[location]!.count : location ? p.bar[side] : 0;
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.caption}>{translate('positions.edit_hint')}</Text>
      <View style={styles.row}>
        {(['white', 'black'] as const).map(player => <PositionAction key={player} testID={`position-bar-${player}`} label={`${translate(`positions.${player}_bar`)} · ${p.bar[player]}`} selected={location === `${player}-bar`} onPress={() => onLocation(`${player}-bar`)} />)}
        <Text style={styles.caption}>{translate('positions.off_counts', p.borneOff)}</Text>
      </View>
      {location !== null && (
        <>
          <Text testID="position-selected" style={styles.heading}>{typeof location === 'number' ? translate('positions.point_count', { point: location, count }) : `${translate(`positions.${side}_bar`)} · ${count}`}</Text>
          <View style={styles.row}>
            <PositionAction symbol="minus" label={translate('positions.remove')} testID="position-remove" disabled={!count} onPress={() => edit(-1)} />
            <PositionAction symbol="plus" label={translate('positions.add')} testID="position-add" disabled={!p.borneOff[side]} onPress={() => edit(1)} />
            <PositionAction symbol="trash-2" label={translate('positions.empty_point')} testID="position-empty-point" disabled={!count} onPress={() => edit(-count)} />
          </View>
        </>
      )}
    </View>
  );
}
