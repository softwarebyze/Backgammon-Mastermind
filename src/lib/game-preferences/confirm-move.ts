import type { GameState } from '@/lib/game/types';

import { loadGamePreferences } from './storage';

/** Human turns only — bot turns never wait for confirm. */
export function isLocalHumanTurn(state: GameState): boolean {
  return !(state.mode === 'vs-computer' && state.currentPlayer === 'black');
}

/**
 * When Confirm move is on, live human plays defer handing the turn off until
 * the player taps Confirm. Engine search / AI / replay keep the default
 * auto-pass behavior.
 */
export function shouldDeferTurnEnd(state: GameState): boolean {
  if (!loadGamePreferences().confirmMove) {
    return false;
  }
  return isLocalHumanTurn(state);
}

/** Dice spent or no legal moves left — show the confirm bar. */
export function isAwaitingMoveConfirm(
  state: GameState,
  confirmMoveEnabled: boolean,
): boolean {
  if (!confirmMoveEnabled || !isLocalHumanTurn(state)) {
    return false;
  }
  if (state.phase === 'no-move') {
    return true;
  }
  return state.phase === 'moving' && state.remainingDice.length === 0;
}
