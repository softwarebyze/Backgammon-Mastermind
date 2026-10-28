import type { ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { styles } from './position-styles';

export function PositionAction({ label, onPress, selected, disabled, testID, icon, primary = false, inline = false, symbol, iconOnly = false, compact = false }: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
  icon?: ReactNode;
  primary?: boolean;
  inline?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  symbol?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, compact && styles.compactButton, primary && !inline && styles.primaryButton, selected && styles.active, primary && styles.primary, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {symbol && <Feather name={symbol} size={18} color={primary ? GAME_PALETTE.controlInk : GAME_PALETTE.text} accessible={false} />}
      {icon}
      {!iconOnly && <Text style={[styles.buttonText, primary && styles.activeText]}>{label}</Text>}
    </Pressable>
  );
}
