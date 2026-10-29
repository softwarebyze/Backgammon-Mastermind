import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { translate } from '@/lib/i18n';
import { editCheckers, newPosition } from '@/lib/positions/position';
import { PositionAction } from './position-controls';
import { PositionStepper } from './position-stepper';
import { StripPanel } from './position-strip-panel';
import { styles } from './position-styles';

/** Exact count for the selected point or bar, in the strip under the board. */
export function PositionStackPanel({ position: p, location, color, onChange, onLocation, onDone }: {
  position: Position;
  location: PositionLocation;
  color: Player;
  onChange: (p: Position) => void;
  onLocation: (location: PositionLocation) => void;
  onDone: () => void;
}) {
  const owner = typeof location === 'string' ? location === 'white-bar' ? 'white' : 'black' : p.points[location]!.player;
  const side = owner ?? color;
  const count = typeof location === 'number' ? p.points[location]!.count : p.bar[side];
  const setCount = (next: number) => {
    const edited = editCheckers({ ...p, dice: [0, 0], context: newPosition().context }, location, side, next - count);
    onChange({ ...edited, dice: p.dice, context: p.context });
    if (typeof location === 'string' && edited.bar[side] === 0)
      onLocation(`${color}-bar`);
  };
  const title = typeof location === 'number'
    ? translate('positions.point_title', { point: location })
    : translate(`positions.${side}_bar`);
  return (
    <StripPanel title={title} icon={<CheckerToken player={side} size={20} />} onDone={onDone} testID="position-point-controls">
      <View style={styles.stripRow}>
        <PositionStepper
          label={title}
          testID="position-stack-count"
          value={count}
          min={0}
          max={count + p.borneOff[side]}
          onChange={setCount}
        />
        <PositionAction compact symbol="trash-2" label={translate('positions.empty_point')} testID="position-empty-point" disabled={!count} onPress={() => setCount(0)} />
      </View>
      <Text style={styles.stripHint}>
        {p.borneOff[side]
          ? translate('positions.spare_checkers', { count: p.borneOff[side], player: translate(`positions.${side}`) })
          : translate('positions.no_checkers', { player: translate(`positions.${side}`) })}
      </Text>
    </StripPanel>
  );
}
