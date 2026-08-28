import { Stack } from 'expo-router';

import { gamePlayScreenOptions } from '@/lib/navigation/native-stack-options';

export default function GameLayout() {
  return (
    <Stack>
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
