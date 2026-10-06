import { Stack } from 'expo-router';

import { useTranslation } from 'react-i18next';

import { languageScreenLayout } from '@/lib/i18n';
import { learnStackOptions } from '@/lib/navigation/native-stack-options';
import { stackEscapeHeaderOptions } from '@/lib/navigation/stack-escape-header';

const screenLayout = languageScreenLayout();

export default function LearnLayout() {
  // Reactive `t` (not memoized `translate`) so header titles refresh when the
  // language switches in place on web; React Compiler tracks it as a dependency.
  const { t } = useTranslation();
  return (
    <Stack screenLayout={screenLayout}>
      <Stack.Screen
        name="index"
        options={{
          ...learnStackOptions(t('learn.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
      <Stack.Screen
        name="[lesson-id]"
        options={{
          ...learnStackOptions(t('learn.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
      <Stack.Screen
        name="graduation"
        options={{
          ...learnStackOptions(t('learn.graduation.title')),
          ...stackEscapeHeaderOptions(),
        }}
      />
    </Stack>
  );
}
