import type { GameState, Move } from '@/lib/game/types';

import { getLegalMoves } from '@/lib/game/moves';

/** The live legal move matching the next planned step, or null when the plan no longer fits. */
export function nextPlannedMove(state: GameState, planned: readonly Move[]): Move | null {
  const step = planned[0];
  if (!step)
    return null;
  const matches = getLegalMoves(state).filter(m => m.from === step.from && m.to === step.to);
  // A bear-off can spend either die; the app may list it under the other one.
  return matches.find(m => state.remainingDice[m.dieIndex] === step.die) ?? matches[0] ?? null;
}
