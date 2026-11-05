import type { CubeDecision } from '@/features/game/cube-analysis';
import { translate } from '@/lib/i18n';

/** What the player chose or should have chosen, in the words of the buttons they press. */
export function cubeChoiceLabel(choice: CubeDecision): string {
  return choice === 'roll' ? translate('game.money.no_double') : translate(`game.match.${choice === 'offer' ? 'double' : choice}`);
}

/** Name the mistake the way a teacher would: what you did, against what was right. */
export function cubeMistakeTitle(attempted: CubeDecision, best: CubeDecision): string {
  if (attempted === 'roll' && best === 'offer')
    return translate('game.cube_tutor.missed_double');
  if (attempted === 'offer' && best === 'roll')
    return translate('game.cube_tutor.wrong_double');
  if (attempted === 'accept' && best === 'drop')
    return translate('game.cube_tutor.wrong_take');
  if (attempted === 'drop' && best !== 'drop')
    return translate('game.cube_tutor.wrong_pass');
  return translate('game.cube_tutor.better_choice');
}
