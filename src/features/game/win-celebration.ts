import type { GameMode, GamePhase, Player } from '@/lib/game';

export function shouldCelebrateWin(args: {
  prevPhase: GamePhase | null;
  nextPhase: GamePhase;
  mode: GameMode;
  winner: Player | null;
  isReviewing: boolean;
}): boolean {
  const { prevPhase, nextPhase, mode, winner, isReviewing } = args;
  if (isReviewing || !prevPhase || prevPhase === 'game-over' || nextPhase !== 'game-over') {
    return false;
  }
  if (mode === 'vs-computer' && winner !== 'white') {
    return false;
  }
  return winner !== null;
}
