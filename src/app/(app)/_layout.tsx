import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { HeaderButton } from 'expo-router/react-navigation';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SettingsHeaderButton } from '@/components/navigation/settings-header-button';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import {
  homeScreenOptions,
  pickerFormSheetOptions,
  settingsStackOptions,
} from '@/lib/navigation/native-stack-options';

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
          headerLeft: () => (
            <HeaderButton
              accessibilityLabel="Back"
              onPress={() => {
                hapticLight();
                router.back();
              }}
            >
              <Feather name="chevron-left" size={24} color={GAME_PALETTE.accent} />
            </HeaderButton>
          ),
        }}
      />
      <Stack.Screen
        name="language"
        options={pickerFormSheetOptions(translate('settings.language'))}
      />
      <Stack.Screen
        name="theme"
        options={pickerFormSheetOptions(translate('settings.theme.title'))}
      />
    </Stack>
  );
}
