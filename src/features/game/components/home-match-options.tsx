import { StyleSheet, Switch, Text, View } from 'react-native';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { GAME_PALETTE } from '@/features/game/game-palette';
import i18n, { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { HOME_INK } from './home-ink';

/** React Native Web ignores thumbColor; it reads these instead. */
const WEB_SWITCH_COLORS = { activeThumbColor: HOME_INK.ivory, activeTrackColor: GAME_PALETTE.accent } as object;

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
    <View style={styles.group}>
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
        <View style={styles.match}>
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
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{translate('home.setup.crawford')}</Text>
            <Switch
              testID="home-crawford"
              accessibilityLabel={translate('home.setup.crawford')}
              value={crawford}
              onValueChange={onCrawfordChange}
              trackColor={{ false: GAME_PALETTE.surface, true: GAME_PALETTE.accent }}
              thumbColor={HOME_INK.ivory}
              ios_backgroundColor={GAME_PALETTE.surface}
              {...WEB_SWITCH_COLORS}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  // Match settings sit in a quieter inset under the format choice.
  match: { gap: 10, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: HOME_INK.hairline },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, color: HOME_INK.ivory, fontSize: 15, ...interFont('medium') },
});
