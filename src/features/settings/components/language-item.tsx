import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import { GAME_PALETTE } from '@/features/game/game-palette';

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
      icon={<Feather name="globe" size={20} color={GAME_PALETTE.textMuted} />}
      onPress={() => router.push('/language')}
    />
  );
}
