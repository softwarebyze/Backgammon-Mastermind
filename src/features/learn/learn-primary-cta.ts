import type { LessonId } from '@/lib/learn/curriculum';

export type LearnPrimaryKind = 'hint' | 'continue' | 'next_lesson' | 'graduation_quiz';

/** Stable footer CTA kind — last lesson goes to the quiz, not "Next lesson". */
export function learnPrimaryCtaKind(opts: {
  awaitingBoardAction: boolean;
  stepComplete: boolean;
  stepIndex: number;
  totalSteps: number;
  nextLessonId: LessonId | 'graduation' | null;
}): LearnPrimaryKind {
  if (opts.awaitingBoardAction) {
    return 'hint';
  }
  const lastStep = opts.totalSteps > 0 && opts.stepIndex >= opts.totalSteps - 1;
  if (lastStep && opts.stepComplete && opts.nextLessonId === 'graduation') {
    return 'graduation_quiz';
  }
  if (lastStep && opts.stepComplete) {
    return 'next_lesson';
  }
  return 'continue';
}

export function learnPrimaryCtaKey(kind: LearnPrimaryKind):
  | 'learn.hint'
  | 'learn.continue'
  | 'learn.next_lesson'
  | 'learn.graduation.quiz_title' {
  switch (kind) {
    case 'hint':
      return 'learn.hint';
    case 'next_lesson':
      return 'learn.next_lesson';
    case 'graduation_quiz':
      return 'learn.graduation.quiz_title';
    default:
      return 'learn.continue';
  }
}
