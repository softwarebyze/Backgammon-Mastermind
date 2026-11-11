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

function saveLearnProgress(progress: LearnProgress): void {
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

/** Last step succeeded — persist even if the player leaves before Next lesson. */
export function isLastStepComplete(
  stepComplete: boolean,
  stepIndex: number,
  totalSteps: number,
): boolean {
  return stepComplete && totalSteps > 0 && stepIndex >= totalSteps - 1;
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

/**
 * Where finishing `lessonId` leads: the next lesson not done yet, in course
 * order and wrapping round, or the quick check once every lesson is done.
 * Lessons open in any order, so the last lesson in the list is not the end.
 */
export function nextAfterLesson(progress: LearnProgress, lessonId: LessonId): LessonId | 'graduation' {
  const done = new Set<LessonId>([...progress.completedLessons, lessonId]);
  const start = LESSON_IDS.indexOf(lessonId);
  for (let step = 1; step <= LESSON_IDS.length; step++) {
    const id = LESSON_IDS[(start + step) % LESSON_IDS.length]!;
    if (!done.has(id))
      return id;
  }
  return 'graduation';
}

/** What to study next from the hub: the first lesson not done yet in course order, or the quick check. */
export function nextToStudy(progress: LearnProgress): LessonId | 'graduation' {
  return LESSON_IDS.find(id => !progress.completedLessons.includes(id)) ?? 'graduation';
}

export function isReadyToPlay(progress: LearnProgress): boolean {
  return allLessonsComplete(progress) && progress.quizPassed;
}
