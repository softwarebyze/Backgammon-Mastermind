import type { LessonId } from '@/lib/learn/curriculum';
import type { LearnProgress } from '@/lib/learn/progress';

import { useCallback, useSyncExternalStore } from 'react';
import {
  loadLearnProgress,
  markLessonComplete,
  markLessonStarted,
  markQuizPassed,
} from '@/lib/learn/progress';

let cached = loadLearnProgress();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): LearnProgress {
  return cached;
}

function setProgress(next: LearnProgress) {
  cached = next;
  emit();
}

export function useLearnProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const startLearning = useCallback(() => {
    setProgress(markLessonStarted(cached));
  }, []);

  const completeLesson = useCallback((lessonId: LessonId) => {
    setProgress(markLessonComplete(cached, lessonId));
  }, []);

  const completeQuiz = useCallback(() => {
    setProgress(markQuizPassed(cached));
  }, []);

  return {
    progress,
    startLearning,
    completeLesson,
    completeQuiz,
  };
}
