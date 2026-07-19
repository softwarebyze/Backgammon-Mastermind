import { Redirect, useLocalSearchParams } from 'expo-router';

import { ChallengeScreen } from '@/features/learn';
import { isChallengeId } from '@/lib/learn/challenges';

export default function ChallengeRoute() {
  const params = useLocalSearchParams<{ 'lesson-id': string }>();
  const challengeId = params['lesson-id'];
  if (!challengeId || !isChallengeId(challengeId)) {
    return <Redirect href="/learn" />;
  }
  return <ChallengeScreen challengeId={challengeId} />;
}
