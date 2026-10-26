import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GAME_PALETTE as palette } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

export function PositionAction({ label, onPress, selected, disabled, testID, primary = false }: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
  primary?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (selected || primary) && styles.active, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={[styles.buttonText, (selected || primary) && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

export function PositionSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

export function PositionNumber({ label, value, onChange, max = 32767, testID }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  testID?: string;
}) {
  return (
    <View style={styles.number}>
      <Text style={styles.caption}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        testID={testID}
        keyboardType="number-pad"
        selectTextOnFocus
        value={String(value)}
        onChangeText={(text) => {
          if (/^\d{0,5}$/.test(text))
            onChange(Math.min(max, Number(text)));
        }}
        style={styles.numberInput}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 16, gap: 20 },
  section: { gap: 12, borderTopWidth: 1, borderTopColor: palette.surfaceBorder, paddingTop: 20 },
  heading: { ...interFont('semibold'), color: palette.text, fontSize: 19 },
  caption: { ...interFont('regular'), color: '#CBB8A7', fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  button: { borderRadius: 10, backgroundColor: palette.surface, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  buttonText: { ...interFont('medium'), color: palette.accent, fontSize: 14, textAlign: 'center' },
  active: { backgroundColor: palette.control },
  activeText: { color: palette.controlInk },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  input: { ...interFont('regular'), color: palette.text, backgroundColor: palette.surface, padding: 12, minHeight: 48, borderRadius: 10, fontSize: 16, textAlignVertical: 'top' },
  number: { minWidth: 92, gap: 4 },
  numberInput: { ...interFont('medium'), color: palette.text, fontSize: 17, backgroundColor: palette.surface, minHeight: 44, paddingHorizontal: 12, borderRadius: 8 },
  error: { ...interFont('regular'), color: '#FFBCAD', fontSize: 14, lineHeight: 21 },
  board: { alignItems: 'center' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
