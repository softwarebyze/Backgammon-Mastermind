import type { GameMode, GamePhase, Player } from '@/lib/game';
import type { MatchState } from '@/lib/game/match';

export function shouldCelebrateWin(args: {
  prevPhase: GamePhase | null;
  nextPhase: GamePhase;
  mode: GameMode;
  winner: Player | null;
  isReviewing: boolean;
  match?: Pick<MatchState, 'winner'> | null;
}): boolean {
  const { prevPhase, nextPhase, mode, winner, isReviewing } = args;
  if (isReviewing || !prevPhase || prevPhase === 'game-over' || nextPhase !== 'game-over') {
    return false;
  }
  if (args.match && !args.match.winner) {
    return false;
  }
  if (mode === 'vs-computer' && winner !== 'white') {
    return false;
  }
  return winner !== null;
}
