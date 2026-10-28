import type { ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { styles } from './position-styles';

export function PositionAction({ label, onPress, selected, disabled, testID, icon, primary = false, symbol, iconOnly = false, compact = false }: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
  icon?: ReactNode;
  primary?: boolean;
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
      style={({ pressed }) => [styles.button, compact && styles.compactButton, primary && styles.primaryButton, selected && styles.active, primary && styles.primary, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {symbol && <Feather name={symbol} size={18} color={primary ? GAME_PALETTE.controlInk : GAME_PALETTE.text} accessible={false} />}
      {icon}
      {!iconOnly && <Text style={[styles.buttonText, primary && styles.activeText]}>{label}</Text>}
    </Pressable>
  );
}

export function PositionDisclosure({ label, summary, symbol, open, onPress, testID, children }: {
  label: string;
  summary?: string;
  symbol: React.ComponentProps<typeof Feather>['name'];
  open: boolean;
  onPress: () => void;
  testID: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.disclosure}>
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={onPress} style={({ pressed }) => [styles.disclosureRow, pressed && styles.pressed]}>
        <Feather name={symbol} size={21} color={GAME_PALETTE.accent} accessible={false} />
        <View style={styles.disclosureLabel}>
          <Text style={styles.disclosureTitle}>{label}</Text>
          {!!summary && <Text style={styles.caption}>{summary}</Text>}
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={GAME_PALETTE.accentDim} accessible={false} />
      </Pressable>
      {open && <View style={styles.disclosureBody}>{children}</View>}
    </View>
  );
}
