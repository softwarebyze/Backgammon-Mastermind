import { router } from 'expo-router';
import * as React from 'react';

import i18n, { LANGUAGE_NAMES, useSelectedLanguage } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

export function LanguageItem() {
  const { language } = useSelectedLanguage();

  // MMKV is empty until the user picks explicitly — fall back to the active i18n language.
  const active = language ?? (i18n.language as keyof typeof LANGUAGE_NAMES);
  const label = LANGUAGE_NAMES[active] ?? LANGUAGE_NAMES.en;

  return (
    <SettingsItem
      text="settings.language"
      value={label}
      onPress={() => router.push('/language')}
    />
  );
}
