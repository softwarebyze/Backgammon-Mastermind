import type { ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { styles } from './position-styles';

export function PositionAction({ label, onPress, selected, disabled, testID, icon, primary = false, inline = false, symbol, iconOnly = false, compact = false, segment = false, chip = false }: {
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
  /** One option of a segmented control; grows to share the row. */
  segment?: boolean;
  /** A small on/off rule such as Crawford. */
  chip?: boolean;
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
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        segment && styles.segment,
        chip && styles.chip,
        primary && !inline && styles.primaryButton,
        selected && (segment || chip ? styles.segmentActive : styles.active),
        primary && styles.primary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {symbol && <Feather name={symbol} size={chip ? 14 : 18} color={primary ? GAME_PALETTE.controlInk : GAME_PALETTE.text} accessible={false} />}
      {icon}
      {!iconOnly && (
        <Text numberOfLines={1} style={[styles.buttonText, (segment || chip) && styles.segmentText, primary && styles.activeText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
