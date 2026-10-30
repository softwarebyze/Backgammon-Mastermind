import { Redirect, useLocalSearchParams } from 'expo-router';

import { LessonScreen } from '@/features/learn';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { isLessonId, resolveLessonAccess } from '@/lib/learn/curriculum';

export default function LessonRoute() {
  const params = useLocalSearchParams<{ 'lesson-id': string }>();
  const { progress } = useLearnProgress();
  const lessonId = params['lesson-id'];
  if (!lessonId || !isLessonId(lessonId)) {
    return <Redirect href="/learn" />;
  }
  // A locked lesson's URL opens the first lesson still to do instead (#303).
  const allowed = resolveLessonAccess(lessonId, progress.completedLessons);
  if (allowed !== lessonId) {
    return <Redirect href={`/learn/${allowed}`} />;
  }
  return <LessonScreen lessonId={lessonId} />;
}
