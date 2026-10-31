import { StyleSheet, Switch, Text, View } from 'react-native';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { GAME_PALETTE } from '@/features/game/game-palette';
import i18n, { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { HOME_INK } from './home-ink';

/** React Native Web ignores thumbColor; it reads these instead. */
const WEB_SWITCH_COLORS = { activeThumbColor: HOME_INK.ivory, activeTrackColor: GAME_PALETTE.accent } as object;

/** Matches are played to odd lengths; longer ones can be set up in the position editor. */
const MATCH_LENGTHS = [1, 3, 5, 7, 9, 11];

export function HomeMatchOptions({ format, length, crawford, onFormatChange, onLengthChange, onCrawfordChange, part = 'all' }: {
  format: 'single' | 'match';
  length: number;
  /** The Crawford rule for the whole match: no doubling in the game after a player reaches match point. */
  crawford: boolean;
  onFormatChange: (format: 'single' | 'match') => void;
  onLengthChange: (length: number) => void;
  onCrawfordChange: (crawford: boolean) => void;
  /** Landscape splits the format choice from the match details into two columns. */
  part?: 'all' | 'format' | 'details';
}) {
  const showFormat = part !== 'details';
  const showDetails = part !== 'format' && format === 'match';
  return (
    <View style={styles.group}>
      {showFormat && (
        <HomeSetupChoice
          label={i18n.t('home.setup.format', { defaultValue: 'Play' })}
          value={format}
          onChange={onFormatChange}
          options={[
            { value: 'single', label: i18n.t('home.setup.single', { defaultValue: 'Single game' }), testID: 'home-format-single' },
            { value: 'match', label: i18n.t('home.setup.match', { defaultValue: 'Match' }), testID: 'home-format-match' },
          ]}
        />
      )}
      {showDetails && (
        <View style={[styles.match, part === 'details' && styles.matchAside]}>
          {/* Beside the format choice the inset reads as match settings; the radiogroup keeps its label. */}
          {part === 'details' ? null : <Text style={styles.switchLabel}>{translate('home.setup.length')}</Text>}
          <HomeSetupChoice
            label={translate('home.setup.length')}
            value={length}
            onChange={onLengthChange}
            options={MATCH_LENGTHS.map(value => ({
              value,
              label: String(value),
              accessibilityLabel: translate('game.match.length', { length: value }),
              testID: `home-match-length-${value}`,
            }))}
          />
          {/* A 1-point match never uses the cube, so Crawford cannot apply. */}
          {length > 1 && (
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
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  // Match settings sit in a quieter inset under the format choice.
  match: { gap: 10, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: HOME_INK.hairline },
  matchAside: { gap: 4 },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, color: HOME_INK.ivory, fontSize: 15, ...interFont('medium') },
});
