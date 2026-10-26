import { Platform } from 'react-native';

import { translate } from '@/lib/i18n';

/**
 * RN-web drops accessibilityHint, so web screen readers would never hear what
 * the dice do. There the hint is folded into the label instead.
 */
export function diceSwapLabel(dice: [number, number], platform: string = Platform.OS): string {
  const label = translate('game.controls.dice_order_a11y', { first: dice[0], second: dice[1] });
  return platform === 'web' ? `${label}. ${translate('game.controls.swap_dice_hint')}` : label;
}
