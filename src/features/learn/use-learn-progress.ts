import type { ChallengeId } from '@/lib/learn/challenges';
import type { LearnProgress } from '@/lib/learn/progress';

import { useCallback, useSyncExternalStore } from 'react';
import {
  loadLearnProgress,
  markChallengeComplete,
  markStarted,
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
    setProgress(markStarted(cached));
  }, []);

  const completeChallenge = useCallback(
    (challengeId: ChallengeId, xpEarned: number, stars: 1 | 2 | 3) => {
      setProgress(markChallengeComplete(cached, challengeId, { xpEarned, stars }));
    },
    [],
  );

  return {
    progress,
    startLearning,
    completeChallenge,
  };
}
