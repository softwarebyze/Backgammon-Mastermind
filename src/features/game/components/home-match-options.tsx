import type { GameMode } from '@/lib/game';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useGame } from '@/features/game/use-game';
import { createMatchGame } from '@/lib/game/match';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function HomeMatchOptions() {
  const { state, startFromPosition } = useGame();
  const [mode, setMode] = useState<GameMode>('vs-human');
  const start = (length: 3 | 5) => requestReplaceActiveGame({ source: 'home', liveState: state, onReplace: () => {
    startFromPosition(createMatchGame(length, mode));
    router.replace('/game');
  }, onContinue: () => router.replace('/game') });
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{translate('game.match.home_title')}</Text>
      <Text style={styles.note}>{translate('game.match.home_note')}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {(['vs-human', 'vs-computer'] as const).map(option => (
          <HoverPressable
            key={option}
            testID={`match-mode-${option}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: mode === option }}
            accessibilityLabel={translate(option === 'vs-computer' ? 'home.vs_computer_a11y' : 'home.two_players_a11y')}
            onPress={() => setMode(option)}
            style={({ pressed, hovered }) => [styles.button, mode === option && styles.selected, (pressed || hovered) && styles.dim]}
          >
            <Text style={[styles.buttonText, mode === option && styles.selectedText]}>{translate(option === 'vs-computer' ? 'home.vs_computer' : 'home.two_players')}</Text>
          </HoverPressable>
        ))}
      </View>
      <View style={styles.row}>
        {([3, 5] as const).map(length => (
          <HoverPressable
            key={length}
            testID={`start-match-${length}`}
            accessibilityRole="button"
            accessibilityLabel={translate('game.match.length', { length })}
            onPress={() => start(length)}
            style={({ pressed, hovered }) => [styles.button, (pressed || hovered) && styles.dim]}
          >
            <Text style={styles.buttonText}>{translate('game.match.length', { length })}</Text>
          </HoverPressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: '100%', paddingVertical: 12, gap: 8 },
  title: { color: GAME_PALETTE.accent, fontSize: 18, ...interFont('semibold') },
  note: { color: GAME_PALETTE.textMuted, fontSize: 13, lineHeight: 19, ...interFont('regular') },
  row: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: GAME_PALETTE.accentDim },
  buttonText: { color: GAME_PALETTE.accent, fontSize: 16, ...interFont('semibold') },
  selected: { backgroundColor: GAME_PALETTE.accent },
  selectedText: { color: GAME_PALETTE.bg },
  dim: { opacity: 0.75 },
});
