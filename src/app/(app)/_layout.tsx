import { Stack } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SettingsHeaderButton } from '@/components/navigation/settings-header-button';
import { languageScreenLayout, translate, useSelectedLanguage } from '@/lib/i18n';
import {
  homeScreenOptions,
  pickerFormSheetOptions,
  settingsStackOptions,
} from '@/lib/navigation/native-stack-options';
import { stackEscapeHeaderOptions } from '@/lib/navigation/stack-escape-header';

/** `learn` hosts its own Stack; it keys its screens itself so its history survives. */
const screenLayout = languageScreenLayout(['learn']);

export default function AppLayout() {
  // Re-render on language change so translated header titles refresh in place (web).
  useSelectedLanguage();
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
          ...settingsStackOptions(),
          ...stackEscapeHeaderOptions(),
        }}
      />
      <Stack.Screen
        name="language"
        options={pickerFormSheetOptions(translate('settings.language'))}
      />
      <Stack.Screen
        name="developer"
        options={{
          ...settingsStackOptions(),
          ...stackEscapeHeaderOptions(),
          title: translate('settings.developer'),
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
