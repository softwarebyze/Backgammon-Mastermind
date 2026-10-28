import type { Position } from '@/lib/positions/position';
import { Pressable, Text, View } from 'react-native';
import { DieFace, EmptyDiePlaceholder } from '@/features/game/components/board/dice-display';
import { translate } from '@/lib/i18n';
import { styles } from './position-styles';

/** Two persistent die faces; a tap opens six explicit choices without a keyboard. */
export function PositionDice({ position: p, editing, onEdit }: {
  position: Position;
  editing: 0 | 1 | null;
  onEdit: (index: 0 | 1 | null) => void;
}) {
  return (
    <View style={styles.diceEditor}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {([0, 1] as const).map(index => (
          <Pressable key={index} testID={`position-die-${index}`} accessibilityRole="button" accessibilityLabel={`${translate(index === 0 ? 'positions.die_one' : 'positions.die_two')}: ${p.dice[index] || translate('positions.roll_later')}`} accessibilityState={{ expanded: editing === index }} onPress={() => onEdit(editing === index ? null : index)} style={({ pressed }) => [styles.dieButton, editing === index && styles.active, pressed && styles.pressed]}>
            {p.dice[index] > 0
              ? <DieFace value={p.dice[index]} used={false} playerColor={p.currentPlayer} displayStyle="dots" size={36} />
              : (
                  <View>
                    <EmptyDiePlaceholder playerColor={p.currentPlayer} size={36} />
                    <Text style={styles.unsetDie}>–</Text>
                  </View>
                )}
          </Pressable>
        ))}
      </View>

    </View>
  );
}

export function PositionDiceChoices({ position: p, onChange, editing, onEdit }: {
  position: Position;
  onChange: (p: Position) => void;
  editing: 0 | 1;
  onEdit: (index: null) => void;
}) {
  return (
    <View testID="position-dice-picker" style={styles.dicePicker}>
      {([1, 2, 3, 4, 5, 6] as const).map(value => (
        <Pressable
          key={value}
          testID={`position-dice-value-${value}`}
          accessibilityRole="button"
          accessibilityLabel={String(value)}
          accessibilityState={{ selected: p.dice[editing] === value }}
          onPress={() => {
            const dice: [number, number] = [p.dice[0] || 1, p.dice[1] || 1];
            dice[editing] = value;
            onChange({ ...p, dice });
            onEdit(null);
          }}
          style={({ pressed }) => [styles.dieButton, { flex: 1 }, p.dice[editing] === value && styles.active, pressed && styles.pressed]}
        >
          <DieFace value={value} used={false} playerColor={p.currentPlayer} displayStyle="dots" size={30} />
        </Pressable>
      ))}
    </View>
  );
}
