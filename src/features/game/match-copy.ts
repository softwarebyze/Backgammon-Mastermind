import type { Player } from '@/lib/game';
import { translate } from '@/lib/i18n';

export function matchPlayer(player: Player | 'center'): string {
  return translate(player === 'center' ? 'game.match.center' : player === 'white' ? 'game.match.white' : 'game.match.black');
}
