import { router } from 'expo-router';

import i18n, { LANGUAGE_NAMES, useSelectedLanguage } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

export function LanguageItem() {
  const { language } = useSelectedLanguage();

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
