import type { ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { NativeStepper } from './native-stepper';
import { styles } from './position-styles';

/**
 * A stepper in the platform style: the value sits beside a compact − | +
 * control rather than between two big buttons. iOS uses the system stepper;
 * Android and web draw the same two-segment shape. No keyboard is involved.
 */
export function PositionStepper({ label, value, display, min, max, onChange, testID, leading }: {
  label: string;
  value: number;
  /** Text shown for the value (e.g. "Money" for 0). */
  display?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  testID: string;
  /** Replaces the value text, e.g. the cube face itself. */
  leading?: ReactNode;
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
    <View style={styles.stepperRow}>
      {leading ?? (
        <Text testID={testID} accessibilityLabel={`${label}: ${shown}`} style={[styles.stepperValue, shown.length > 3 && styles.stepperValueSmall]}>
          {shown}
        </Text>
      )}
      {NativeStepper
        ? <NativeStepper label={label} value={value} min={min} max={max} onChange={change} testID={`${testID}-control`} />
        : (
            <View style={styles.stepperControl}>
              <StepSegment symbol="minus" label={`${label} −`} disabled={value <= min} onPress={() => change(value - 1)} testID={`${testID}-lower`} />
              <View style={styles.stepperDivider} />
              <StepSegment symbol="plus" label={`${label} +`} disabled={value >= max} onPress={() => change(value + 1)} testID={`${testID}-higher`} />
            </View>
          )}
    </View>
  );
}

function StepSegment({ symbol, label, disabled, onPress, testID }: { symbol: 'minus' | 'plus'; label: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8 }}
      onPress={onPress}
      style={({ pressed }) => [styles.stepperSegment, pressed && styles.stepperSegmentPressed]}
    >
      <Feather name={symbol} size={18} color={GAME_PALETTE.text} style={disabled && styles.disabled} accessible={false} />
    </Pressable>
  );
}
