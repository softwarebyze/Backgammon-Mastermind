import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { HeaderButton } from 'expo-router/react-navigation';
import { Platform } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import {
  gameFormSheetOptions,
  gamePlayScreenOptions,
} from '@/lib/navigation/native-stack-options';

export default function GameLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={gamePlayScreenOptions} />
      <Stack.Screen
        name="options"
        options={{
          ...gameFormSheetOptions(),
          // Web modal header needs an explicit dismiss — native formSheet uses the grabber.
          ...(Platform.OS === 'web'
            ? {
                headerLeft: () => (
                  <HeaderButton
                    accessibilityLabel={translate('game.controls.close_options_a11y')}
                    onPress={() => {
                      hapticLight();
                      router.back();
                    }}
                  >
                    <Feather name="x" size={22} color={GAME_PALETTE.accent} />
                  </HeaderButton>
                ),
              }
            : null),
        }}
      />
    </Stack>
  );
}
