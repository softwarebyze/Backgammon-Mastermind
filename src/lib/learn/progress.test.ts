import { CHALLENGE_IDS } from './challenges';
import {
  allChallengesComplete,
  EMPTY_LEARN_PROGRESS,
  isReadyToPlay,
  markChallengeComplete,
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
  it('records completed challenges', () => {
    let progress = { ...EMPTY_LEARN_PROGRESS };
    for (const id of CHALLENGE_IDS) {
      progress = markChallengeComplete(progress, id, { xpEarned: 10, stars: 3 });
    }
    expect(allChallengesComplete(progress)).toBe(true);
    expect(isReadyToPlay(progress)).toBe(true);
  });

  it('is idempotent when completing the same challenge twice', () => {
    let progress = markChallengeComplete(EMPTY_LEARN_PROGRESS, 'roll-move', { xpEarned: 10, stars: 3 });
    progress = markChallengeComplete(progress, 'roll-move', { xpEarned: 10, stars: 3 });
    expect(progress.completedChallenges).toEqual(['roll-move']);
  });

  it('keeps best star rating', () => {
    let progress = markChallengeComplete(EMPTY_LEARN_PROGRESS, 'roll-move', { xpEarned: 10, stars: 1 });
    expect(progress.starsByChallenge['roll-move']).toBe(1);
    progress = markChallengeComplete(progress, 'roll-move', { xpEarned: 10, stars: 3 });
    expect(progress.starsByChallenge['roll-move']).toBe(3);
  });

  it('accumulates XP', () => {
    let progress = markChallengeComplete(EMPTY_LEARN_PROGRESS, 'roll-move', { xpEarned: 15, stars: 3 });
    expect(progress.totalXp).toBe(15);
    progress = markChallengeComplete(progress, 'find-home', { xpEarned: 10, stars: 2 });
    expect(progress.totalXp).toBe(25);
  });
});
