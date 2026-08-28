import { Stack } from 'expo-router';

import { translate } from '@/lib/i18n';
import { learnStackOptions } from '@/lib/navigation/native-stack-options';
import { stackEscapeHeaderOptions } from '@/lib/navigation/stack-escape-header';

export default function LearnLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...learnStackOptions(translate('learn.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
      <Stack.Screen
        name="[lesson-id]"
        options={{
          ...learnStackOptions(translate('learn.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
      <Stack.Screen
        name="graduation"
        options={{
          ...learnStackOptions(translate('learn.graduation.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
    </Stack>
  );
}
