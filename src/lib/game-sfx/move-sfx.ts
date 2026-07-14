import type { GameState, Move } from '@/lib/game';
import { shouldCelebrateWin } from '@/features/game/win-celebration';
import { opponent } from '@/lib/game';

import { BEAR_OFF } from '@/lib/game/constants';

export type GameSfxKind = 'roll' | 'hit' | 'bearOff' | 'win';

/** Which one-shots to play for a completed move (order = play order). */
export function sfxKindsForMove(
  snapshot: GameState,
  move: Move,
  next: GameState,
): GameSfxKind[] {
  const kinds: GameSfxKind[] = [];
  const opp = opponent(snapshot.currentPlayer);
  if (next.bar[opp] > snapshot.bar[opp]) {
    kinds.push('hit');
  }
  if (move.to === BEAR_OFF) {
    kinds.push('bearOff');
  }
  if (
    shouldCelebrateWin({
      prevPhase: snapshot.phase,
      nextPhase: next.phase,
      mode: next.mode,
      winner: next.winner,
      isReviewing: false,
    })
  ) {
    kinds.push('win');
  }
  return kinds;
}
