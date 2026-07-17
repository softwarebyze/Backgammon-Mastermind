import { Redirect, useLocalSearchParams } from 'expo-router';

import { LessonScreen } from '@/features/learn';
import { isLessonId } from '@/lib/learn/curriculum';

export default function LessonRoute() {
  const params = useLocalSearchParams<{ 'lesson-id': string }>();
  const lessonId = params['lesson-id'];
  if (!lessonId || !isLessonId(lessonId)) {
    return <Redirect href="/learn" />;
  }
  return <LessonScreen lessonId={lessonId} />;
}
