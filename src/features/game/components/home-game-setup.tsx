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

export function HomeGameSetup({ onStart }: { onStart: (mode: GameMode, length: 3 | 5 | null, crawfordRule: boolean) => void }) {
  const [mode, setMode] = useState<GameMode>('vs-computer');
  const [format, setFormat] = useState<'single' | 'match'>('single');
  const [length, setLength] = useState<3 | 5>(3);
  const [crawford, setCrawford] = useState(true);
  return (
    <View style={styles.setup}>
      <HomeSetupChoice
        label={i18n.t('home.setup.opponent', { defaultValue: 'Opponent' })}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'vs-computer', label: translate('home.vs_computer'), accessibilityLabel: translate('home.vs_computer_a11y'), testID: 'home-opponent-vs-computer' },
          { value: 'vs-human', label: translate('home.two_players'), accessibilityLabel: translate('home.two_players_a11y'), testID: 'home-opponent-vs-human' },
        ]}
      />
      <HomeMatchOptions format={format} length={length} crawford={crawford} onFormatChange={setFormat} onLengthChange={setLength} onCrawfordChange={setCrawford} />
      {/* The only amber block on the screen: everything above feeds this. */}
      <HoverPressable
        testID="home-start-game"
        accessibilityRole="button"
        onPress={() => onStart(mode, format === 'match' ? length : null, crawford)}
        style={({ pressed, hovered }) => [styles.start, hovered && styles.hovered, pressed && styles.pressed]}
      >
        <Text style={styles.startText}>
          {format === 'match'
            ? i18n.t('home.setup.start_match', { length, defaultValue: 'Start {{length}}-point match' })
            : i18n.t('home.setup.start_single', { defaultValue: 'Start game' })}
        </Text>
        <Feather name="play" size={18} color={GAME_PALETTE.controlInk} accessible={false} />
      </HoverPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { width: '100%', gap: 10 },
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
