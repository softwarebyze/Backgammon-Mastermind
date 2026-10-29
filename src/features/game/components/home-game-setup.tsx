import type { GameMode } from '@/lib/game';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { HomeMatchOptions } from '@/features/game/components/home-match-options';
import { HomeSetupChoice } from '@/features/game/components/home-setup-choice';
import { GAME_PALETTE } from '@/features/game/game-palette';
import i18n, { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function HomeGameSetup({ onStart }: { onStart: (mode: GameMode, length: 3 | 5 | null) => void }) {
  const [mode, setMode] = useState<GameMode>('vs-computer');
  const [format, setFormat] = useState<'single' | 'match'>('single');
  const [length, setLength] = useState<3 | 5>(3);
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
      <HomeMatchOptions format={format} length={length} onFormatChange={setFormat} onLengthChange={setLength} />
      <HoverPressable
        testID="home-start-game"
        accessibilityRole="button"
        onPress={() => onStart(mode, format === 'match' ? length : null)}
        style={({ pressed, hovered }) => [styles.start, hovered && styles.hovered, pressed && styles.pressed]}
      >
        <Text style={styles.startText}>
          {format === 'match'
            ? i18n.t('home.setup.start_match', { length, defaultValue: 'Start {{length}}-point match' })
            : i18n.t('home.setup.start_single', { defaultValue: 'Start game' })}
        </Text>
      </HoverPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { width: '100%', gap: 16 },
  start: { minHeight: 52, padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: GAME_PALETTE.accent },
  startText: { color: GAME_PALETTE.bg, fontSize: 17, textAlign: 'center', ...interFont('bold') },
  hovered: { backgroundColor: GAME_PALETTE.controlHover },
  pressed: { opacity: 0.8 },
});
