import { View } from 'react-native';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import i18n, { translate } from '@/lib/i18n';

export function HomeMatchOptions({ format, length, onFormatChange, onLengthChange }: {
  format: 'single' | 'match';
  length: 3 | 5;
  onFormatChange: (format: 'single' | 'match') => void;
  onLengthChange: (length: 3 | 5) => void;
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
      )}
    </View>
  );
}
