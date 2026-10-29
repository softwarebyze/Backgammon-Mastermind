import type { ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { styles } from './position-styles';

/**
 * A vertical stepper: ▲ above the value, ▼ below it, so the control reads as
 * part of the object it changes (a scorecard, the cube, a stack count). No
 * keyboard is involved.
 */
export function PositionStepper({ label, value, display, min, max, onChange, testID, children, disabled = false }: {
  label: string;
  value: number;
  /** Text shown for the value (e.g. "Money" for 0). */
  display?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  testID: string;
  /** Replaces the plain number, e.g. a scorecard or the cube face. */
  children?: ReactNode;
  disabled?: boolean;
}) {
  const shown = display ?? String(value);
  const change = (next: number) => {
    const clamped = Math.max(min, Math.min(max, next));
    if (clamped !== value) {
      hapticSelection();
      onChange(clamped);
    }
  };
  return (
    <View style={[styles.stepperColumn, disabled && styles.disabled]}>
      <StepButton symbol="chevron-up" label={`${label} +`} disabled={disabled || value >= max} onPress={() => change(value + 1)} testID={`${testID}-higher`} />
      <View testID={testID} accessible accessibilityLabel={`${label}: ${shown}`} accessibilityRole="adjustable">
        {children ?? <Text style={[styles.stepperValue, shown.length > 3 && styles.stepperValueSmall]}>{shown}</Text>}
      </View>
      <StepButton symbol="chevron-down" label={`${label} −`} disabled={disabled || value <= min} onPress={() => change(value - 1)} testID={`${testID}-lower`} />
    </View>
  );
}

function StepButton({ symbol, label, disabled, onPress, testID }: { symbol: 'chevron-up' | 'chevron-down'; label: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ left: 10, right: 10, top: 6, bottom: 6 }}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
    >
      <Feather name={symbol} size={20} color={GAME_PALETTE.text} style={disabled && styles.stepIconDisabled} accessible={false} />
    </Pressable>
  );
}
