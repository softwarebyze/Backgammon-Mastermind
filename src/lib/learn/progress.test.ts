import { LESSON_IDS } from './curriculum';
import {
  allLessonsComplete,
  EMPTY_LEARN_PROGRESS,
  isLastStepComplete,
  isReadyToPlay,
  markLessonComplete,
  markQuizPassed,
} from './progress';

jest.mock('@/lib/storage', () => {
  const store = new Map<string, string>();
  return {
    getItem: <T>(key: string): T | null => {
      const value = store.get(key);
      return value ? (JSON.parse(value) as T) : null;
    },
    setItem: async <T>(key: string, value: T) => {
      store.set(key, JSON.stringify(value));
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
});

describe('learn progress', () => {
  it('records completed lessons and quiz', () => {
    let progress = { ...EMPTY_LEARN_PROGRESS };
    for (const id of LESSON_IDS) {
      progress = markLessonComplete(progress, id);
    }
    expect(allLessonsComplete(progress)).toBe(true);
    expect(isReadyToPlay(progress)).toBe(false);

    progress = markQuizPassed(progress);
    expect(isReadyToPlay(progress)).toBe(true);
  });

  it('is idempotent when completing the same lesson twice', () => {
    let progress = markLessonComplete(EMPTY_LEARN_PROGRESS, 'goal-board');
    progress = markLessonComplete(progress, 'goal-board');
    expect(progress.completedLessons).toEqual(['goal-board']);
  });

  it('treats the last successful step as ready to persist', () => {
    expect(isLastStepComplete(true, 1, 2)).toBe(true);
    expect(isLastStepComplete(true, 0, 2)).toBe(false);
    expect(isLastStepComplete(false, 1, 2)).toBe(false);
  });
});
