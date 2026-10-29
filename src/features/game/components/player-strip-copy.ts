import type { GameState, Player } from '@/lib/game';
import { getTurnDisplay, playerLabel } from '@/lib/game/turn-display';
import { translate } from '@/lib/i18n';

/** "You" / "Computer" against the computer, the color name in pass-and-play. */
export function playerDisplayName(state: GameState, player: Player): string {
  if (state.mode === 'vs-computer') {
    return translate(player === 'white' ? 'game.players.you' : 'game.players.computer');
  }
  return playerLabel(player);
}

function winnerStatus(state: GameState): string {
  if (state.winner === 'white') {
    return state.mode === 'vs-computer'
      ? translate('game.status.you_win')
      : translate('game.status.white_wins');
  }
  return state.mode === 'vs-computer'
    ? translate('game.status.computer_wins')
    : translate('game.status.black_wins');
}

/** What the strip says under the name, or null when this side is just waiting. */
export function playerStripStatus(state: GameState, player: Player, headlineOverride: string | null): string | null {
  if (state.phase === 'game-over') {
    return state.winner === player ? winnerStatus(state) : null;
  }
  if (state.currentPlayer !== player) {
    return null;
  }
  return headlineOverride ?? getTurnDisplay(state).headline;
}
