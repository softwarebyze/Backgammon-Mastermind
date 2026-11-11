import type { ReactNode } from 'react';
import type { GameMode } from '@/lib/game';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { ComputerLevelPicker } from '@/features/game/components/computer-level-picker';
import { HOME_INK } from '@/features/game/components/home-ink';
import { HomeMatchOptions } from '@/features/game/components/home-match-options';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import i18n, { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/** Everything a new game needs, gathered on one raised panel that ends in Start. */
export function HomeGameSetup({ onStart, columns = false, tight = false, levelHint = false, flat = false, aside = null }: {
  onStart: (mode: GameMode, length: number | null, crawfordRule: boolean) => void;
  /** Landscape phones: the choices (and `aside`) on the left, match details and Start on the right. */
  columns?: boolean;
  /** Very short portrait screens: tighter gaps, no "Match length" label. */
  tight?: boolean;
  /** Room to spare: say what the computer's levels mean under the picker. */
  levelHint?: boolean;
  /** Narrow or very short screens: no panel around the choices, so each keeps its full width. */
  flat?: boolean;
  aside?: ReactNode;
}) {
  const sunken = !columns && !flat;
  const [mode, setMode] = useState<GameMode>('vs-computer');
  const [format, setFormat] = useState<'single' | 'match'>('single');
  const [length, setLength] = useState(3);
  const [crawford, setCrawford] = useState(true);
  const matchProps = { format, length, crawford, onFormatChange: setFormat, onLengthChange: setLength, onCrawfordChange: setCrawford };
  const { preferences, setComputerLevel } = useGamePreferences();
  const opponentChoice = (
    <HomeSetupChoice
      sunken={sunken}
      label={i18n.t('home.setup.opponent', { defaultValue: 'Opponent' })}
      value={mode}
      onChange={setMode}
      options={[
        { value: 'vs-computer', label: translate('home.vs_computer'), accessibilityLabel: translate('home.vs_computer_a11y'), testID: 'home-opponent-vs-computer' },
        { value: 'vs-human', label: translate('home.two_players'), accessibilityLabel: translate('home.two_players_a11y'), testID: 'home-opponent-vs-human' },
      ]}
    />
  );
  // The level is a preference: the next game starts at the level last picked.
  const opponent = mode === 'vs-computer'
    ? (
        <View style={[styles.opponent, tight && styles.opponentTight]}>
          {opponentChoice}
          <ComputerLevelPicker value={preferences.computerLevel} onChange={setComputerLevel} testIDPrefix="home-computer-level" sunken={sunken} />
          {levelHint && !columns ? <Text testID="home-computer-level-hint" style={styles.hint}>{translate('game.computer_level.hint')}</Text> : null}
        </View>
      )
    : opponentChoice;
  const start = (
    <HoverPressable
      testID="home-start-game"
      accessibilityRole="button"
      onPress={() => onStart(mode, format === 'match' ? length : 0, crawford && length > 1)}
      style={({ pressed, hovered }) => [styles.start, (columns || tight) && styles.startColumns, hovered && styles.hovered, pressed && styles.pressed]}
    >
      <Text style={styles.startText}>
        {format === 'match'
          ? i18n.t('home.setup.start_match', { length, defaultValue: 'Start {{length}}-point match' })
          : i18n.t('home.setup.start_single', { defaultValue: 'Start game' })}
      </Text>
      <Feather name="play" size={18} color={GAME_PALETTE.controlInk} accessible={false} />
    </HoverPressable>
  );
  if (columns) {
    return (
      <View style={styles.columns}>
        <View style={styles.column}>
          {opponent}
          <HomeMatchOptions {...matchProps} part="format" />
          {aside}
        </View>
        <View style={[styles.column, styles.columnEnd]}>
          <HomeMatchOptions {...matchProps} part="details" />
          {start}
        </View>
      </View>
    );
  }
  return (
    <View testID="home-new-game" style={[styles.setup, tight && styles.setupTight, sunken && styles.panel]}>
      {opponent}
      <HomeMatchOptions {...matchProps} bare={tight} sunken={sunken} />
      {/* The only amber block on the screen: everything above feeds this. */}
      {start}
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { width: '100%', gap: 10 },
  setupTight: { gap: 8 },
  panel: {
    padding: 10,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: HOME_INK.hairline,
    ...continuousRadius(22),
  },
  hint: { paddingHorizontal: 6, color: HOME_INK.muted, fontSize: 12.5, lineHeight: 17, ...interFont('regular') },
  opponent: { gap: 6 },
  opponentTight: { gap: 4 },
  columns: { width: '100%', flexDirection: 'row', gap: 16 },
  column: { flex: 1, minWidth: 0, gap: 8 },
  // Start sits at the bottom of its column, level with the cards on the left.
  columnEnd: { justifyContent: 'flex-end' },
  startColumns: { marginTop: 0, minHeight: 48 },
  start: {
    marginTop: 2,
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...continuousRadius(14),
    backgroundColor: GAME_PALETTE.control,
    shadowColor: GAME_PALETTE.control,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startText: { color: GAME_PALETTE.controlInk, fontSize: 17, textAlign: 'center', ...interFont('bold') },
  hovered: { backgroundColor: GAME_PALETTE.controlHover },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
