import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { styles } from './position-styles';

/**
 * − value + with no keyboard. Scores, match length and cube value are small
 * integers; tapping beats summoning a number pad (and its iOS Done toolbar).
 */
export function PositionStepper({ label, value, display, min, max, onChange, testID, wide = false }: {
  label: string;
  value: number;
  display?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  testID: string;
  wide?: boolean;
}) {
  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) {
      hapticSelection();
      onChange(next);
    }
  };
  const shown = display ?? String(value);
  return (
    <View style={styles.stepper} accessible={false}>
      <StepButton symbol="minus" label={`${label} −`} disabled={value <= min} onPress={() => step(-1)} testID={`${testID}-lower`} />
      <Text
        testID={testID}
        accessibilityLabel={`${label}: ${shown}`}
        style={[styles.stepperValue, wide && styles.stepperValueWide, shown.length > 3 && styles.stepperValueSmall]}
      >
        {shown}
      </Text>
      <StepButton symbol="plus" label={`${label} +`} disabled={value >= max} onPress={() => step(1)} testID={`${testID}-higher`} />
    </View>
  );
}

function StepButton({ symbol, label, disabled, onPress, testID }: { symbol: 'minus' | 'plus'; label: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.stepperButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Feather name={symbol} size={18} color={GAME_PALETTE.text} accessible={false} />
    </Pressable>
  );
}
