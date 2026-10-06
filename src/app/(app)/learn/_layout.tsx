import { Stack } from 'expo-router';

import { languageScreenLayout, translate, useSelectedLanguage } from '@/lib/i18n';
import { learnStackOptions } from '@/lib/navigation/native-stack-options';
import { stackEscapeHeaderOptions } from '@/lib/navigation/stack-escape-header';

const screenLayout = languageScreenLayout();

export default function LearnLayout() {
  // Re-render on language change so translated header titles refresh in place (web).
  useSelectedLanguage();
  return (
    <Stack screenLayout={screenLayout}>
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
