import { learnPrimaryCtaKey, learnPrimaryCtaKind } from './learn-primary-cta';

describe('learnPrimaryCtaKind', () => {
  it('shows Hint while the board still needs a tap', () => {
    expect(learnPrimaryCtaKind({
      awaitingBoardAction: true,
      stepComplete: false,
      stepIndex: 0,
      totalSteps: 3,
      nextLessonId: 'direction-setup',
    })).toBe('hint');
  });

  it('keeps Continue on non-final completed steps (praise-until-Continue)', () => {
    expect(learnPrimaryCtaKind({
      awaitingBoardAction: false,
      stepComplete: true,
      stepIndex: 0,
      totalSteps: 3,
      nextLessonId: 'direction-setup',
    })).toBe('continue');
  });

  it('labels the last lesson CTA as the graduation quiz, not Next lesson', () => {
    expect(learnPrimaryCtaKind({
      awaitingBoardAction: false,
      stepComplete: true,
      stepIndex: 1,
      totalSteps: 2,
      nextLessonId: 'graduation',
    })).toBe('graduation_quiz');
    expect(learnPrimaryCtaKey('graduation_quiz')).toBe('learn.graduation.quiz_title');
  });

  it('uses Next lesson when another lesson follows', () => {
    expect(learnPrimaryCtaKind({
      awaitingBoardAction: false,
      stepComplete: true,
      stepIndex: 2,
      totalSteps: 3,
      nextLessonId: 'bearing-off',
    })).toBe('next_lesson');
  });
});
