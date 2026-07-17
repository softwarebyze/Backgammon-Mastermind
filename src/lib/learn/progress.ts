import type { LessonId } from '@/lib/learn/curriculum';

import { LESSON_IDS } from '@/lib/learn/curriculum';
import { getItem, setItem } from '@/lib/storage';

const STORAGE_KEY = 'LEARN_PROGRESS';

export type LearnProgress = {
  completedLessons: LessonId[];
  quizPassed: boolean;
  hasStarted: boolean;
};

export const EMPTY_LEARN_PROGRESS: LearnProgress = {
  completedLessons: [],
  quizPassed: false,
  hasStarted: false,
};

function sanitize(raw: Partial<LearnProgress> | null): LearnProgress {
  if (!raw) {
    return { ...EMPTY_LEARN_PROGRESS };
  }
  const completedLessons = (raw.completedLessons ?? []).filter(
    (id): id is LessonId => (LESSON_IDS as readonly string[]).includes(id),
  );
  return {
    completedLessons,
    quizPassed: Boolean(raw.quizPassed),
    hasStarted: Boolean(raw.hasStarted) || completedLessons.length > 0,
  };
}

export function loadLearnProgress(): LearnProgress {
  return sanitize(getItem<Partial<LearnProgress>>(STORAGE_KEY));
}

export function saveLearnProgress(progress: LearnProgress): void {
  void setItem(STORAGE_KEY, progress);
}

export function markLessonStarted(progress: LearnProgress): LearnProgress {
  if (progress.hasStarted) {
    return progress;
  }
  const next = { ...progress, hasStarted: true };
  saveLearnProgress(next);
  return next;
}

export function markLessonComplete(
  progress: LearnProgress,
  lessonId: LessonId,
): LearnProgress {
  if (progress.completedLessons.includes(lessonId)) {
    return progress;
  }
  const next: LearnProgress = {
    ...progress,
    hasStarted: true,
    completedLessons: [...progress.completedLessons, lessonId],
  };
  saveLearnProgress(next);
  return next;
}

export function markQuizPassed(progress: LearnProgress): LearnProgress {
  const next: LearnProgress = {
    ...progress,
    hasStarted: true,
    quizPassed: true,
  };
  saveLearnProgress(next);
  return next;
}

export function completedLessonCount(progress: LearnProgress): number {
  return progress.completedLessons.length;
}

export function allLessonsComplete(progress: LearnProgress): boolean {
  return LESSON_IDS.every(id => progress.completedLessons.includes(id));
}

export function isReadyToPlay(progress: LearnProgress): boolean {
  return allLessonsComplete(progress) && progress.quizPassed;
}
