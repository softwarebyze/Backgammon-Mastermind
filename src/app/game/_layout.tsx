import { Stack } from 'expo-router';

import { languageScreenLayout } from '@/lib/i18n';
import { gamePlayScreenOptions } from '@/lib/navigation/native-stack-options';

const screenLayout = languageScreenLayout();

export default function GameLayout() {
  return (
    <Stack screenLayout={screenLayout}>
      <Stack.Screen name="index" options={gamePlayScreenOptions} />
      <Stack.Screen
        name="options"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
    </Stack>
  );
}
