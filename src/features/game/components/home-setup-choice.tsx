import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { HOME_INK } from './home-ink';

type Option<T> = { value: T; label: string; accessibilityLabel?: string; testID: string };

/**
 * A segmented control on a wooden track. The chosen option is an ivory tile,
 * like a checker; the screen keeps its amber for the one Play button.
 */
export function HomeSetupChoice<T extends string | number>({ label, value, options, onChange }: {
  /** Names the group for screen readers; the options speak for themselves on screen. */
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(option => (
        <HoverPressable
          key={option.value}
          testID={option.testID}
          accessibilityRole="radio"
          accessibilityLabel={option.accessibilityLabel ?? option.label}
          accessibilityState={{ checked: value === option.value }}
          onPress={() => onChange(option.value)}
          style={({ pressed, hovered }) => [
            styles.option,
            hovered && value !== option.value && styles.hovered,
            value === option.value && styles.selected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.text, value === option.value && styles.selectedText]} numberOfLines={2}>{option.label}</Text>
        </HoverPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: HOME_INK.hairline,
  },
  option: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  // Long labels ("Gegen Computer" at 320) wrap to a second line instead of losing their end.
  text: { color: HOME_INK.muted, fontSize: 15, lineHeight: 18, textAlign: 'center', ...interFont('semibold') },
  selected: {
    backgroundColor: HOME_INK.ivory,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  selectedText: { color: GAME_PALETTE.bg },
  hovered: { backgroundColor: 'rgba(236, 228, 212, 0.08)' },
  pressed: { opacity: 0.8 },
});
