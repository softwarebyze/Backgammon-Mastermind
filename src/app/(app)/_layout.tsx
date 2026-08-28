import { Stack } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SettingsHeaderButton } from '@/components/navigation/settings-header-button';
import { translate } from '@/lib/i18n';
import {
  homeScreenOptions,
  pickerFormSheetOptions,
  settingsStackOptions,
} from '@/lib/navigation/native-stack-options';
import { stackEscapeHeaderOptions } from '@/lib/navigation/stack-escape-header';

export default function AppLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
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
        name="learn"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
