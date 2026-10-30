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
  const [celebration, setCelebration] = useState<{
    phase: GamePhase | null;
    burstKey: number;
    active: boolean;
  }>({ phase: null, burstKey: 0, active: false });
  const nextPhase = liveState?.phase ?? null;

  // Each result owns its eligibility. A previous game's key must never become
  // visible again on an intermediate match win, a loss, or a reviewed result.
  if (nextPhase !== celebration.phase) {
    const active = !!liveState && shouldCelebrateWin({
      prevPhase: celebration.phase,
      nextPhase: liveState.phase,
      mode: liveState.mode,
      winner: liveState.winner,
      isReviewing,
      match: liveState.match,
    });
    setCelebration({
      phase: nextPhase,
      burstKey: celebration.burstKey + (active ? 1 : 0),
      active,
    });
  }
  else if (isReviewing && celebration.active) {
    setCelebration({ ...celebration, active: false });
  }

  return nextPhase === 'game-over' && !isReviewing && celebration.active ? celebration.burstKey : 0;
}
