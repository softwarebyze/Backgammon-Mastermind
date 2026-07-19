import type { ChallengeId } from '@/lib/learn/challenges';

import { CHALLENGE_IDS } from '@/lib/learn/challenges';
import { getItem, setItem } from '@/lib/storage';

const STORAGE_KEY = 'LEARN_PROGRESS';

export type LearnProgress = {
  completedChallenges: ChallengeId[];
  starsByChallenge: Partial<Record<ChallengeId, 1 | 2 | 3>>;
  totalXp: number;
  hasStarted: boolean;
};

export const EMPTY_LEARN_PROGRESS: LearnProgress = {
  completedChallenges: [],
  starsByChallenge: {},
  totalXp: 0,
  hasStarted: false,
};

function sanitize(raw: Partial<LearnProgress> | null): LearnProgress {
  if (!raw) {
    return { ...EMPTY_LEARN_PROGRESS };
  }

  const completedChallenges = (raw.completedChallenges ?? []).filter(
    (id): id is ChallengeId => (CHALLENGE_IDS as readonly string[]).includes(id),
  );

  const starsByChallenge: Partial<Record<ChallengeId, 1 | 2 | 3>> = {};
  for (const [key, val] of Object.entries(raw.starsByChallenge ?? {})) {
    if (
      (CHALLENGE_IDS as readonly string[]).includes(key)
      && (val === 1 || val === 2 || val === 3)
    ) {
      starsByChallenge[key as ChallengeId] = val;
    }
  }

  return {
    completedChallenges,
    starsByChallenge,
    totalXp: Number(raw.totalXp) || 0,
    hasStarted: Boolean(raw.hasStarted) || completedChallenges.length > 0,
  };
}

export function loadLearnProgress(): LearnProgress {
  return sanitize(getItem<Partial<LearnProgress>>(STORAGE_KEY));
}

function saveLearnProgress(progress: LearnProgress): void {
  void setItem(STORAGE_KEY, progress);
}

export function markStarted(progress: LearnProgress): LearnProgress {
  if (progress.hasStarted) {
    return progress;
  }
  const next = { ...progress, hasStarted: true };
  saveLearnProgress(next);
  return next;
}

export function markChallengeComplete(
  progress: LearnProgress,
  challengeId: ChallengeId,
  options: { xpEarned: number; stars: 1 | 2 | 3 },
): LearnProgress {
  if (progress.completedChallenges.includes(challengeId)) {
    const prevStars = progress.starsByChallenge[challengeId] ?? 1;
    const bestStars = Math.max(prevStars, options.stars) as 1 | 2 | 3;
    return {
      ...progress,
      hasStarted: true,
      starsByChallenge: { ...progress.starsByChallenge, [challengeId]: bestStars },
    };
  }
  const next: LearnProgress = {
    ...progress,
    hasStarted: true,
    completedChallenges: [...progress.completedChallenges, challengeId],
    starsByChallenge: { ...progress.starsByChallenge, [challengeId]: options.stars },
    totalXp: progress.totalXp + options.xpEarned,
  };
  saveLearnProgress(next);
  return next;
}

export function completedChallengeCount(progress: LearnProgress): number {
  return progress.completedChallenges.length;
}

export function allChallengesComplete(progress: LearnProgress): boolean {
  return CHALLENGE_IDS.every(id => progress.completedChallenges.includes(id));
}

export function isReadyToPlay(progress: LearnProgress): boolean {
  return allChallengesComplete(progress);
}

export function totalStars(progress: LearnProgress): number {
  return Object.values(progress.starsByChallenge).reduce(
    (sum, s) => sum + (s ?? 0),
    0,
  );
}

export const MAX_STARS = CHALLENGE_IDS.length * 3;
