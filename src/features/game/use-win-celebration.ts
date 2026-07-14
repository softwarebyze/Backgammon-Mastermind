import type { GamePhase, GameState } from '@/lib/game';
import { useState } from 'react';

import { shouldCelebrateWin } from '@/features/game/win-celebration';

/**
 * Fires a one-shot celebration key when live play transitions into game-over.
 * Skips review scrubbing and (in vs-computer) computer wins.
 */
export function useWinCelebration(
  liveState: GameState | null,
  isReviewing: boolean,
): number {
  const [burstKey, setBurstKey] = useState(0);
  const [prevPhase, setPrevPhase] = useState<GamePhase | null>(null);

  const nextPhase = liveState?.phase ?? null;

  // Adjust state while rendering when phase changes (React “store info from previous renders”).
  if (liveState && nextPhase !== prevPhase) {
    if (
      shouldCelebrateWin({
        prevPhase,
        nextPhase: liveState.phase,
        mode: liveState.mode,
        winner: liveState.winner,
        isReviewing,
      })
    ) {
      setBurstKey(k => k + 1);
    }
    setPrevPhase(nextPhase);
  }
  else if (!liveState && prevPhase !== null) {
    setPrevPhase(null);
  }

  return burstKey;
}
