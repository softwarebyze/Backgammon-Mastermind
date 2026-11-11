import { LESSON_IDS } from './curriculum';
import {
  allLessonsComplete,
  EMPTY_LEARN_PROGRESS,
  isLastStepComplete,
  isReadyToPlay,
  markLessonComplete,
  markQuizPassed,
  nextAfterLesson,
  nextToStudy,
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

describe('nextAfterLesson', () => {
  const progressWith = (completedLessons: typeof LESSON_IDS[number][]) => ({ completedLessons, quizPassed: false, hasStarted: true });

  it('goes to the next lesson in course order', () => {
    expect(nextAfterLesson(progressWith([]), LESSON_IDS[0])).toBe(LESSON_IDS[1]);
  });

  it('wraps round to an earlier lesson when the last one is finished first', () => {
    // Finishing the last lesson before the others used to open the quick check, which then showed only a gate.
    expect(nextAfterLesson(progressWith([]), LESSON_IDS[LESSON_IDS.length - 1])).toBe(LESSON_IDS[0]);
  });

  it('skips lessons already done', () => {
    expect(nextAfterLesson(progressWith([LESSON_IDS[1], LESSON_IDS[2]]), LESSON_IDS[0])).toBe(LESSON_IDS[3]);
  });

  it('opens the quick check once this lesson completes the set', () => {
    const others = LESSON_IDS.filter(id => id !== LESSON_IDS[2]);
    expect(nextAfterLesson(progressWith([...others]), LESSON_IDS[2])).toBe('graduation');
  });
});

describe('nextToStudy', () => {
  it('is the first lesson for a newcomer', () => {
    expect(nextToStudy(EMPTY_LEARN_PROGRESS)).toBe(LESSON_IDS[0]);
  });

  it('is the earliest lesson not done yet, whatever was done out of order', () => {
    const progress = { ...EMPTY_LEARN_PROGRESS, completedLessons: [LESSON_IDS[0], LESSON_IDS[1], LESSON_IDS[6]] };
    expect(nextToStudy(progress)).toBe(LESSON_IDS[2]);
  });

  it('is the quick check once every lesson is done', () => {
    expect(nextToStudy({ ...EMPTY_LEARN_PROGRESS, completedLessons: [...LESSON_IDS] })).toBe('graduation');
  });
});
