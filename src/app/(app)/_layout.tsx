import { Stack } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsHeaderButton } from '@/components/navigation/settings-header-button';
import { languageScreenLayout } from '@/lib/i18n';
import {
  homeScreenOptions,
  pickerFormSheetOptions,
  settingsStackOptions,
} from '@/lib/navigation/native-stack-options';
import { stackEscapeHeaderOptions } from '@/lib/navigation/stack-escape-header';

/** `learn` hosts its own Stack; it keys its screens itself so its history survives. */
const screenLayout = languageScreenLayout(['learn']);

export default function AppLayout() {
  // Reactive `t` (not memoized `translate`) so header titles refresh when the
  // language switches in place on web; React Compiler tracks it as a dependency.
  const { t } = useTranslation();
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
      screenLayout={screenLayout}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1E0C02' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          ...homeScreenOptions,
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          ...settingsStackOptions(t('settings.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
      <Stack.Screen
        name="language"
        options={pickerFormSheetOptions(t('settings.language'))}
      />
      <Stack.Screen
        name="developer"
        options={{
          ...settingsStackOptions(t('settings.title')),
          ...stackEscapeHeaderOptions(),
          title: t('settings.developer'),
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="learn"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
