import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { editCheckers, newPosition } from '@/lib/positions/position';
import { styles } from './position-styles';

/**
 * Contextual controls float over the board (placed by PositionBoardEditor),
 *  so they never move the board in flow.
 */
export function PositionEditor({ position: p, location, color, onChange, onLocation }: {
  position: Position;
  location: PositionLocation;
  color: Player;
  dimensions: BoardDimensions;
  onChange: (p: Position) => void;
  onLocation: (location: PositionLocation) => void;
}) {
  const owner = typeof location === 'string' ? location === 'white-bar' ? 'white' : 'black' : p.points[location]!.player;
  const side = owner ?? color;
  const count = typeof location === 'number' ? p.points[location]!.count : p.bar[side];
  const edit = (delta: number) => {
    const edited = editCheckers({ ...p, dice: [0, 0], context: newPosition().context }, location, side, delta);
    onChange({ ...edited, dice: p.dice, context: p.context });
    if (typeof location === 'string' && edited.bar[side] === 0)
      onLocation(`${color}-bar`);
  };
  return (
    <View testID="position-point-controls" style={styles.pointControls}>
      <View style={styles.stackControls}>
        <Pressable testID="position-remove" accessibilityRole="button" accessibilityLabel={translate('positions.remove')} accessibilityState={{ disabled: !count }} disabled={!count} onPress={() => edit(-1)} style={({ pressed }) => [styles.stackStep, !count && styles.disabled, pressed && styles.pressed]}>
          <Feather name="minus" size={18} color={GAME_PALETTE.text} accessible={false} />
        </Pressable>
        <Pressable testID="position-empty-point" accessibilityRole="button" accessibilityLabel={`${translate('positions.empty_point')}, ${count}`} accessibilityState={{ disabled: !count }} disabled={!count} onPress={() => edit(-count)} style={({ pressed }) => [styles.stackClear, !count && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.stackCount}>{count}</Text>
          <Feather name="trash-2" size={13} color={GAME_PALETTE.accentDim} accessible={false} />
        </Pressable>
        <Pressable testID="position-add" accessibilityRole="button" accessibilityLabel={translate('positions.add')} accessibilityState={{ disabled: !p.borneOff[side] }} disabled={!p.borneOff[side]} onPress={() => edit(1)} style={({ pressed }) => [styles.stackStep, !p.borneOff[side] && styles.disabled, pressed && styles.pressed]}>
          <Feather name="plus" size={18} color={GAME_PALETTE.text} accessible={false} />
        </Pressable>
      </View>
    </View>
  );
}
