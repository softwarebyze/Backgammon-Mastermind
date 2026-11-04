import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getNextLessonId, LESSON_IDS } from '@/lib/learn/curriculum';
import en from '@/translations/en.json';

import { learnCompleteBodyKey, learnPrimaryCtaKey, learnPrimaryCtaKind } from './learn-primary-cta';

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

describe('learnCompleteBodyKey', () => {
  it('points the final lesson at the quick check instead of a next lesson', () => {
    const last = LESSON_IDS[LESSON_IDS.length - 1]!;
    expect(learnCompleteBodyKey(getNextLessonId(last))).toBe('learn.lesson_complete_body_last');
    expect(en.learn.lesson_complete_body_last).not.toMatch(/next lesson/i);
    for (const id of LESSON_IDS.slice(0, -1)) {
      expect(learnCompleteBodyKey(getNextLessonId(id))).toBe('learn.lesson_complete_body');
    }
  });

  it('has a distinct last-lesson line with the title placeholder in every locale', () => {
    const dir = join(__dirname, '../../translations');
    const locales = readdirSync(dir).filter(file => file.endsWith('.json'));
    expect(locales).toHaveLength(17);
    for (const file of locales) {
      const { learn } = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
        learn: { lesson_complete_body: string; lesson_complete_body_last: string };
      };
      expect(learn.lesson_complete_body_last).toContain('{{title}}');
      expect(learn.lesson_complete_body_last).not.toBe(learn.lesson_complete_body);
    }
  });
});
