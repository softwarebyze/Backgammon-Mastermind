import { router } from 'expo-router';
import * as React from 'react';

import { translate, useSelectedLanguage } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

export function LanguageItem() {
  const { language } = useSelectedLanguage();

  const label = React.useMemo(() => {
    return language === 'ar'
      ? translate('settings.arabic')
      : translate('settings.english');
  }, [language]);

  return (
    <SettingsItem
      text="settings.language"
      value={label}
      onPress={() => router.push('/language')}
    />
  );
}
