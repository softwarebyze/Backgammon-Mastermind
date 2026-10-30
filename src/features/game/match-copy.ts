import type { GameMode, GameState, Player } from '@/lib/game';
import { translate } from '@/lib/i18n';

/** Against the computer the human is "You" and Black is "Computer"; otherwise the colour. */
export function matchPlayer(player: Player | 'center', mode?: GameMode): string {
  if (player !== 'center' && mode === 'vs-computer')
    return translate(player === 'white' ? 'game.players.you' : 'game.players.computer');
  return translate(player === 'center' ? 'game.match.center' : player === 'white' ? 'game.match.white' : 'game.match.black');
}

/** The pending double, worded to the human when they play the computer. */
export function matchOfferText({ offerer, value, points }: { offerer: Player; value: number; points: number }, mode?: GameMode): string {
  if (mode === 'vs-computer') {
    return offerer === 'white'
      ? translate('game.match.offer_by_you', { value })
      : translate('game.match.offer_to_you', { value, points });
  }
  return translate('game.match.offer', { player: matchPlayer(offerer), opponent: matchPlayer(offerer === 'white' ? 'black' : 'white'), value, points });
}

/** A finished game or match, "You win" when the human won against the computer. */
export function matchResultText(match: NonNullable<GameState['match']>, mode?: GameMode): string | null {
  const r = match.result;
  if (!r)
    return null;
  const kind = translate(`game.match.${r.kind}`);
  if (mode === 'vs-computer' && r.winner === 'white')
    return translate(match.winner ? 'game.match.winner_you' : 'game.match.result_you', { points: r.points, kind });
  return translate(match.winner ? 'game.match.winner' : 'game.match.result', { player: matchPlayer(r.winner, mode), points: r.points, kind });
}
