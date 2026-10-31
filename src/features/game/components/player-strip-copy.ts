import type { GameState, Player } from '@/lib/game';
import { playerLabel } from '@/lib/game/turn-display';
import { translate } from '@/lib/i18n';

/** "You" / "Computer" against the computer, the color name in pass-and-play. */
export function playerDisplayName(state: GameState, player: Player): string {
  if (state.mode === 'vs-computer') {
    return translate(player === 'white' ? 'game.players.you' : 'game.players.computer');
  }
  return playerLabel(player);
}

function isComputer(state: GameState, player: Player): boolean {
  return state.mode === 'vs-computer' && player === 'black';
}

/** The turn under the name. The name is on the line above, so it is never repeated here. */
function turnStatus(state: GameState, player: Player): string {
  if (state.phase === 'opening-roll') {
    return translate('game.turn.opening_roll');
  }
  if (!isComputer(state, player)) {
    return translate('game.players.status_your_turn');
  }
  if (state.phase === 'rolling') {
    return translate('game.players.status_rolling');
  }
  return translate(state.phase === 'no-move' ? 'game.players.status_cant_move' : 'game.players.status_moving');
}

/** What the strip says under the name, or null when this side is just waiting. */
export function playerStripStatus(state: GameState, player: Player, headlineOverride: string | null): string | null {
  if (state.phase === 'game-over') {
    return state.winner === player ? translate('game.players.status_won') : null;
  }
  const offer = state.match?.pendingOffer;
  if (offer) {
    if (offer === player) {
      return translate('game.players.status_doubles', { value: state.match!.cube.value * 2 });
    }
    return isComputer(state, player) ? null : translate('game.players.status_take_or_pass');
  }
  if (state.currentPlayer !== player) {
    return null;
  }
  return headlineOverride ?? turnStatus(state, player);
}
