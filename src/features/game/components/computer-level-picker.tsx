import type { ComputerLevel } from '@/lib/game';

import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { COMPUTER_LEVELS } from '@/lib/game';
import { translate } from '@/lib/i18n';

/** Easy to Expert, as one segmented row. */
export function ComputerLevelPicker({ value, onChange, testIDPrefix = 'computer-level' }: {
  value: ComputerLevel;
  onChange: (level: ComputerLevel) => void;
  testIDPrefix?: string;
}) {
  return (
    <HomeSetupChoice
      label={translate('game.computer_level.title')}
      value={value}
      onChange={onChange}
      options={COMPUTER_LEVELS.map(level => ({
        value: level,
        label: translate(`game.computer_level.${level}`),
        accessibilityLabel: translate('game.computer_level.a11y', { level: translate(`game.computer_level.${level}`) }),
        testID: `${testIDPrefix}-${level}`,
      }))}
    />
  );
}
