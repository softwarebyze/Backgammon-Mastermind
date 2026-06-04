import { router } from 'expo-router';
import * as React from 'react';

import { useSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { translate } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

export function ThemeItem() {
  const { selectedTheme } = useSelectedTheme();

  const themeLabel = React.useMemo(() => {
    if (selectedTheme === 'dark') {
      return translate('settings.theme.dark');
    }
    if (selectedTheme === 'light') {
      return translate('settings.theme.light');
    }
    return translate('settings.theme.system');
  }, [selectedTheme]);

  return (
    <SettingsItem
      text="settings.theme.title"
      value={themeLabel}
      onPress={() => router.push('/theme')}
      showDivider={false}
    />
  );
}
