import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { HeaderButton } from 'expo-router/react-navigation';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { settingsStackOptions } from '@/lib/navigation/native-stack-options';

function LearnBackButton() {
  return (
    <HeaderButton
      accessibilityLabel="Back"
      onPress={() => {
        hapticLight();
        router.back();
      }}
    >
      <Feather name="chevron-left" size={24} color={GAME_PALETTE.accent} />
    </HeaderButton>
  );
}

export default function LearnLayout() {
  return (
    <Stack screenOptions={settingsStackOptions()}>
      <Stack.Screen
        name="index"
        options={{
          title: translate('learn.title'),
          headerLeft: () => <LearnBackButton />,
        }}
      />
      <Stack.Screen
        name="[lesson-id]"
        options={{
          title: translate('learn.title'),
          headerLeft: () => <LearnBackButton />,
        }}
      />
      <Stack.Screen
        name="graduation"
        options={{
          title: translate('learn.graduation.title'),
          headerLeft: () => <LearnBackButton />,
        }}
      />
    </Stack>
  );
}
