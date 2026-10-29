import type { Position } from '@/lib/positions/position';
import { Pressable, View } from 'react-native';
import { DieFace } from '@/features/game/components/board/dice-display';
import { translate } from '@/lib/i18n';
import { PositionAction } from './position-controls';
import { StripPanel } from './position-strip-panel';
import { styles } from './position-styles';

const FACES = [1, 2, 3, 4, 5, 6] as const;

/** One row of six faces per die; "Roll later" clears both so play starts with a roll. */
export function PositionDicePanel({ position: p, onChange, onDone }: { position: Position; onChange: (p: Position) => void; onDone: () => void }) {
  const choose = (index: 0 | 1, value: number) => {
    const dice: [number, number] = [p.dice[0] || value, p.dice[1] || value];
    dice[index] = value;
    onChange({ ...p, dice });
  };
  const rolled = p.dice[0] > 0 && p.dice[1] > 0;
  return (
    <StripPanel
      title={translate('positions.dice')}
      onDone={onDone}
      testID="position-dice-picker"
      accessory={<PositionAction compact symbol="x" label={translate('positions.roll_later')} testID="position-clear-dice" disabled={!rolled} onPress={() => onChange({ ...p, dice: [0, 0] })} />}
    >
      {([0, 1] as const).map(index => (
        <View key={index} style={styles.diceRow} accessibilityLabel={translate(index === 0 ? 'positions.die_one' : 'positions.die_two')}>
          {FACES.map(value => (
            <Pressable
              key={value}
              testID={`position-die-${index}-value-${value}`}
              accessibilityRole="button"
              accessibilityLabel={`${translate(index === 0 ? 'positions.die_one' : 'positions.die_two')}: ${value}`}
              accessibilityState={{ selected: p.dice[index] === value }}
              onPress={() => choose(index, value)}
              style={({ pressed }) => [styles.dieChoice, p.dice[index] === value && styles.dieChoiceSelected, pressed && styles.pressed]}
            >
              <DieFace value={value} used={p.dice[index] !== value} playerColor={p.currentPlayer} displayStyle="dots" size={30} />
            </Pressable>
          ))}
        </View>
      ))}
    </StripPanel>
  );
}
