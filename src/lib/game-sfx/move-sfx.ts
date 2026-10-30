import type { GameState, Move } from '@/lib/game';
import { shouldCelebrateWin } from '@/features/game/win-celebration';
import { opponent } from '@/lib/game';

import { BEAR_OFF } from '@/lib/game/constants';

/** `blocked`: a roll with no legal move (soft two-note "err err"). */
export type GameSfxKind = 'roll' | 'place' | 'hit' | 'bearOff' | 'win' | 'blocked';

/** Which one-shots to play for a completed move (order = play order). */
export function sfxKindsForMove(
  snapshot: GameState,
  move: Move,
  next: GameState,
): GameSfxKind[] {
  const kinds: GameSfxKind[] = [];
  const opp = opponent(snapshot.currentPlayer);
  const isHit = next.bar[opp] > snapshot.bar[opp];
  const isBearOff = move.to === BEAR_OFF;
  if (isHit) {
    kinds.push('hit');
  }
  else if (isBearOff) {
    kinds.push('bearOff');
  }
  else {
    kinds.push('place');
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
