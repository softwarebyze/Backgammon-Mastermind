import type { ReactNode } from 'react';
import type { GameMode } from '@/lib/game';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { HomeMatchOptions } from '@/features/game/components/home-match-options';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { GAME_PALETTE } from '@/features/game/game-palette';
import i18n, { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function HomeGameSetup({ onStart, columns = false, aside = null }: {
  onStart: (mode: GameMode, length: number | null, crawfordRule: boolean) => void;
  /** Landscape phones: the choices (and `aside`) on the left, match details and Start on the right. */
  columns?: boolean;
  aside?: ReactNode;
}) {
  const [mode, setMode] = useState<GameMode>('vs-computer');
  const [format, setFormat] = useState<'single' | 'match'>('single');
  const [length, setLength] = useState(3);
  const [crawford, setCrawford] = useState(true);
  const matchProps = { format, length, crawford, onFormatChange: setFormat, onLengthChange: setLength, onCrawfordChange: setCrawford };
  const opponent = (
    <HomeSetupChoice
      label={i18n.t('home.setup.opponent', { defaultValue: 'Opponent' })}
      value={mode}
      onChange={setMode}
      options={[
        { value: 'vs-computer', label: translate('home.vs_computer'), accessibilityLabel: translate('home.vs_computer_a11y'), testID: 'home-opponent-vs-computer' },
        { value: 'vs-human', label: translate('home.two_players'), accessibilityLabel: translate('home.two_players_a11y'), testID: 'home-opponent-vs-human' },
      ]}
    />
  );
  const start = (
    <HoverPressable
      testID="home-start-game"
      accessibilityRole="button"
      onPress={() => onStart(mode, format === 'match' ? length : null, crawford && length > 1)}
      style={({ pressed, hovered }) => [styles.start, columns && styles.startColumns, hovered && styles.hovered, pressed && styles.pressed]}
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
    <View style={styles.setup}>
      {opponent}
      <HomeMatchOptions {...matchProps} />
      {/* The only amber block on the screen: everything above feeds this. */}
      {start}
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { width: '100%', gap: 10 },
  columns: { width: '100%', flexDirection: 'row', gap: 16 },
  column: { flex: 1, minWidth: 0, gap: 8 },
  // Start sits at the bottom of its column, level with the cards on the left.
  columnEnd: { justifyContent: 'flex-end' },
  startColumns: { marginTop: 0, minHeight: 48 },
  start: {
    marginTop: 6,
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
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
