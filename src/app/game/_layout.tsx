import { Stack } from 'expo-router';

import {
  gameFormSheetOptions,
  gamePlayScreenOptions,
} from '@/lib/navigation/native-stack-options';

export default function GameLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={gamePlayScreenOptions} />
      <Stack.Screen name="options" options={gameFormSheetOptions} />
    </Stack>
  );
}
