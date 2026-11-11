import { StyleSheet, Switch, Text, View } from 'react-native';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { GAME_PALETTE } from '@/features/game/game-palette';
import i18n, { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { forceLtrWebDir } from '@/lib/ui/force-ltr';
import { HOME_INK } from './home-ink';

/** React Native Web ignores thumbColor; it reads these instead. */
const WEB_SWITCH_COLORS = { activeThumbColor: HOME_INK.ivory, activeTrackColor: GAME_PALETTE.accent } as object;

/** Matches are played to odd lengths; longer ones can be set up in the position editor. */
const MATCH_LENGTHS = [1, 3, 5, 7, 9, 11];

export function HomeMatchOptions({ format, length, crawford, onFormatChange, onLengthChange, onCrawfordChange, part = 'all', bare = false, sunken = false }: {
  format: 'single' | 'match';
  length: number;
  /** The Crawford rule for the whole match: no doubling in the game after a player reaches match point. */
  crawford: boolean;
  onFormatChange: (format: 'single' | 'match') => void;
  onLengthChange: (length: number) => void;
  onCrawfordChange: (crawford: boolean) => void;
  /** Landscape splits the format choice from the match details into two columns. */
  part?: 'all' | 'format' | 'details';
  /** No "Match length" label: the length row's radiogroup still names itself. */
  bare?: boolean;
  /** Inside Home's setup panel: tracks are cut into it. */
  sunken?: boolean;
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
          sunken={sunken}
          options={[
            { value: 'single', label: i18n.t('home.setup.single', { defaultValue: 'Single game' }), testID: 'home-format-single' },
            { value: 'match', label: i18n.t('home.setup.match', { defaultValue: 'Match' }), testID: 'home-format-match' },
          ]}
        />
      )}
      {showDetails && (
        <View style={[styles.match, sunken && styles.matchSunken, (part === 'details' || bare) && styles.matchAside]}>
          {/* Beside the format choice the inset reads as match settings; the radiogroup keeps its label. */}
          {part === 'details' || bare ? null : <Text style={[styles.switchLabel, styles.lengthLabel, sunken && styles.inset]}>{translate('home.setup.length')}</Text>}
          <HomeSetupChoice
            label={translate('home.setup.length')}
            value={length}
            onChange={onLengthChange}
            sunken={sunken}
            options={MATCH_LENGTHS.map(value => ({
              value,
              label: String(value),
              accessibilityLabel: translate('game.match.length', { length: value }),
              testID: `home-match-length-${value}`,
            }))}
          />
          {/* A 1-point match never uses the cube, so Crawford cannot apply. */}
          {length > 1 && (
            <View style={[styles.switchRow, sunken && styles.inset]}>
              <Text style={styles.switchLabel}>{translate('home.setup.crawford')}</Text>
              {/* React Native Web draws the thumb away from its track under RTL. */}
              <View {...forceLtrWebDir}>
                <Switch
                  testID="home-crawford"
                  accessibilityLabel={translate('home.setup.crawford')}
                  value={crawford}
                  onValueChange={onCrawfordChange}
                  trackColor={{ false: sunken ? GAME_PALETTE.bg : GAME_PALETTE.surface, true: GAME_PALETTE.accent }}
                  thumbColor={HOME_INK.ivory}
                  ios_backgroundColor={sunken ? GAME_PALETTE.bg : GAME_PALETTE.surface}
                  {...WEB_SWITCH_COLORS}
                />
              </View>
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
  // On Home's panel the group already reads as one: no rule down the side.
  matchSunken: { paddingLeft: 0, borderLeftWidth: 0 },
  inset: { paddingHorizontal: 6 },
  matchAside: { gap: 4 },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lengthLabel: { flex: 0 },
  switchLabel: { flex: 1, color: HOME_INK.ivory, fontSize: 15, ...interFont('medium') },
});
