import type { ColorSchemeType } from '@/lib/hooks/use-selected-theme';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { useSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { translate } from '@/lib/i18n';
import {
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_H,
} from '@/lib/ui/settings-layout';

const THEMES: { value: ColorSchemeType; labelKey: 'settings.theme.dark' | 'settings.theme.light' | 'settings.theme.system' }[] = [
  { value: 'dark', labelKey: 'settings.theme.dark' },
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'system', labelKey: 'settings.theme.system' },
];

export function ThemePickerScreen() {
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.list,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {THEMES.map((theme, index) => {
        const selected = selectedTheme === theme.value;
        return (
          <Pressable
            key={theme.value}
            style={[styles.row, index < THEMES.length - 1 && styles.rowBorder]}
            onPress={() => {
              hapticSelection();
              setSelectedTheme(theme.value);
              router.back();
            }}
          >
            <Text style={styles.label}>{translate(theme.labelKey)}</Text>
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
    paddingTop: 8,
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
