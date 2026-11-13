import type { GameNotePosition } from '@/lib/game/game-notes';
import { notePipCounts } from '@/lib/game/game-notes';
import { translate } from '@/lib/i18n';

function playerName(player: GameNotePosition['currentPlayer']): string {
  return translate(player === 'white' ? 'game.review.player_white' : 'game.review.player_black');
}

/** "Turn 5 · White to play 6-4" — when in the game a note was written. */
export function noteMomentLabel(turn: number, position: GameNotePosition): string {
  if (position.phase === 'opening-roll') {
    return translate('game.notes.opening');
  }
  const when = turn === 0 ? translate('game.notes.opening') : translate('game.notes.turn', { turn });
  return `${when} · ${noteSituationLabel(position)}`;
}

function noteSituationLabel(position: GameNotePosition): string {
  if (position.phase === 'game-over') {
    return translate('game.notes.game_over');
  }
  const player = playerName(position.currentPlayer);
  if (position.dice) {
    return translate('game.notes.to_play', { player, dice: `${position.dice[0]}-${position.dice[1]}` });
  }
  return translate('game.notes.to_roll', { player });
}

/** "Pips 120–98", White first. */
export function notePipsLabel(position: GameNotePosition): string {
  const pips = notePipCounts(position);
  return translate('game.notes.pips', { white: pips.white, black: pips.black });
}
