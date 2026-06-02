import type { Language } from '@/lib/i18n/resources';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { translate, useSelectedLanguage } from '@/lib/i18n';
import {
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_H,
} from '@/lib/ui/settings-layout';

const LANGUAGES: { value: Language; labelKey: 'settings.english' | 'settings.arabic' }[] = [
  { value: 'en', labelKey: 'settings.english' },
  { value: 'ar', labelKey: 'settings.arabic' },
];

export function LanguagePickerScreen() {
  const { language, setLanguage } = useSelectedLanguage();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.list,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {LANGUAGES.map((lang, index) => {
        const selected = language === lang.value;
        return (
          <Pressable
            key={lang.value}
            style={[styles.row, index < LANGUAGES.length - 1 && styles.rowBorder]}
            onPress={() => {
              hapticSelection();
              setLanguage(lang.value);
              router.back();
            }}
          >
            <Text style={styles.label}>{translate(lang.labelKey)}</Text>
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
