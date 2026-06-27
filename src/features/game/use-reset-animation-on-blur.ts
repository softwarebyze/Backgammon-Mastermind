import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useGame } from '@/features/game/use-game';

export function useResetAnimationOnBlur() {
  const { resetAnimation } = useGame();

  useFocusEffect(useCallback(() => () => resetAnimation(), [resetAnimation]));
}
