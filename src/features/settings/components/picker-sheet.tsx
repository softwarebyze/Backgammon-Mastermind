import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import {
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_H,
} from '@/lib/ui/settings-layout';

export type PickerOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: PickerOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  /** Dismiss the form sheet after a selection. Defaults to `true`. */
  dismissOnSelect?: boolean;
};

/**
 * Single-select list rendered inside a `formSheet` (see `pickerFormSheetOptions`).
 *
 * `contentInsetAdjustmentBehavior="automatic"` lives here so every picker insets
 * its content below the native header + safe area — without it the first row is
 * painted under the header. Keep new pickers going through this component so the
 * inset never has to be remembered per-screen.
 */
export function PickerSheet<T extends string>({
  options,
  selectedValue,
  onSelect,
  dismissOnSelect = true,
}: Props<T>) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.list,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {options.map((option, index) => {
        const selected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.row, index < options.length - 1 && styles.rowBorder]}
            onPress={() => {
              hapticSelection();
              onSelect(option.value);
              if (dismissOnSelect)
                router.back();
            }}
          >
            <Text style={styles.label}>{option.label}</Text>
            {selected ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.surface,
  },
  list: {
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    minHeight: SETTINGS_ROW_MIN_HEIGHT,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GAME_PALETTE.surfaceBorder,
  },
  label: {
    color: GAME_PALETTE.text,
    fontSize: 17,
  },
  check: {
    color: GAME_PALETTE.accent,
    fontSize: 18,
    fontWeight: '700',
  },
});
