import { View } from 'react-native';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import i18n, { translate } from '@/lib/i18n';

export function HomeMatchOptions({ format, length, crawford, onFormatChange, onLengthChange, onCrawfordChange }: {
  format: 'single' | 'match';
  length: 3 | 5;
  /** The Crawford rule for the whole match: no doubling in the game after a player reaches match point. */
  crawford: boolean;
  onFormatChange: (format: 'single' | 'match') => void;
  onLengthChange: (length: 3 | 5) => void;
  onCrawfordChange: (crawford: boolean) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <HomeSetupChoice
        label={i18n.t('home.setup.format', { defaultValue: 'Play' })}
        value={format}
        onChange={onFormatChange}
        options={[
          { value: 'single', label: i18n.t('home.setup.single', { defaultValue: 'Single game' }), testID: 'home-format-single' },
          { value: 'match', label: i18n.t('home.setup.match', { defaultValue: 'Match' }), testID: 'home-format-match' },
        ]}
      />
      {format === 'match' && (
        <>
          <HomeSetupChoice
            label={i18n.t('home.setup.length', { defaultValue: 'Match length' })}
            value={length}
            onChange={onLengthChange}
            options={([3, 5] as const).map(value => ({
              value,
              label: translate('game.match.length', { length: value }),
              testID: `home-match-length-${value}`,
            }))}
          />
          <HomeSetupChoice
            label={translate('home.setup.crawford')}
            value={crawford ? 'on' : 'off'}
            onChange={value => onCrawfordChange(value === 'on')}
            options={[
              { value: 'on', label: translate('home.setup.crawford_on'), accessibilityLabel: `${translate('home.setup.crawford')}: ${translate('home.setup.crawford_on')}`, testID: 'home-crawford-on' },
              { value: 'off', label: translate('home.setup.crawford_off'), accessibilityLabel: `${translate('home.setup.crawford')}: ${translate('home.setup.crawford_off')}`, testID: 'home-crawford-off' },
            ]}
          />
        </>
      )}
    </View>
  );
}
