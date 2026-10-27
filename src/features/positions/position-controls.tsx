import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from './position-styles';

export function PositionAction({ label, onPress, selected, disabled, testID, icon, primary = false }: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
  icon?: ReactNode;
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
      {icon}
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
