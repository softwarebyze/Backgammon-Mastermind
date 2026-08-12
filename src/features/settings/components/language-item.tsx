import { router } from 'expo-router';

import i18n, {
  LANGUAGE_NAMES,
  resolveLanguage,
  useSelectedLanguage,
} from '@/lib/i18n';

import { SettingsItem } from './settings-item';

export function LanguageItem() {
  const { language } = useSelectedLanguage();

  // MMKV is empty until the user picks explicitly — fall back to the active i18n language.
  const active = resolveLanguage(language) ?? resolveLanguage(i18n.language) ?? 'en';
  const label = LANGUAGE_NAMES[active];

  return (
    <SettingsItem
      text="settings.language"
      value={label}
      onPress={() => router.push('/language')}
    />
  );
}
