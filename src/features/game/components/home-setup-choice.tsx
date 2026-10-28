import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

type Option<T> = { value: T; label: string; accessibilityLabel?: string; testID: string };

export function HomeSetupChoice<T extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
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
              value === option.value && styles.selected,
              hovered && styles.hovered,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.text, value === option.value && styles.selectedText]}>{option.label}</Text>
          </HoverPressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: GAME_PALETTE.accentDim, fontSize: 14, ...interFont('semibold') },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexGrow: 1,
    flexBasis: 100,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    backgroundColor: GAME_PALETTE.surface,
  },
  text: { color: GAME_PALETTE.accentDim, fontSize: 15, textAlign: 'center', ...interFont('semibold') },
  selected: { borderColor: GAME_PALETTE.accent, backgroundColor: GAME_PALETTE.accent },
  selectedText: { color: GAME_PALETTE.bg },
  hovered: { borderColor: GAME_PALETTE.text },
  pressed: { opacity: 0.8 },
});
