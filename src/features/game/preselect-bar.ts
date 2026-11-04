import type { GameState } from '@/lib/game';
import { BAR_POINT, getLegalMoves } from '@/lib/game';

type PreselectContext = {
  isHumanTurn: boolean;
  isAnimating: boolean;
  interactionEnabled: boolean;
};

/**
 * A checker on the bar must enter before anything else moves, so the bar is
 * the only possible source: select it for the player instead of making them
 * tap it first.
 */
export function shouldPreselectBar(state: GameState | null, { isHumanTurn, isAnimating, interactionEnabled }: PreselectContext): boolean {
  if (!state || !isHumanTurn || isAnimating || !interactionEnabled) {
    return false;
  }
  if (state.phase !== 'moving' || state.selectedPoint !== null || state.bar[state.currentPlayer] === 0) {
    return false;
  }
  return getLegalMoves(state).some(move => move.from === BAR_POINT);
}
