import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COMPUTER_LEVELS } from '@/features/game/engine/sage-difficulty';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { patchGamePreferences, useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function ComputerDifficultyPicker() {
  const { preferences } = useGamePreferences();
  return (
    <View style={styles.wrap} testID="computer-difficulty-picker">
      <Text style={styles.title}>{translate('game.difficulty.title')}</Text>
      <Text style={styles.hint}>{translate('game.difficulty.hint')}</Text>
      {COMPUTER_LEVELS.map(level => (
        <Pressable
          key={level}
          testID={`computer-level-${level}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: preferences.computerLevel === level }}
          accessibilityLabel={translate(`game.difficulty.${level}`)}
          accessibilityHint={translate(`game.difficulty.${level}_description`)}
          onPress={() => {
            hapticSelection();
            patchGamePreferences({ computerLevel: level });
          }}
          style={({ pressed }) => [styles.option, preferences.computerLevel === level && styles.selected, pressed && styles.pressed]}
        >
          <View style={[styles.radio, preferences.computerLevel === level && styles.radioSelected]}>
            {preferences.computerLevel === level && <View style={styles.dot} />}
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{translate(`game.difficulty.${level}`)}</Text>
            <Text style={styles.hint}>{translate(`game.difficulty.${level}_description`)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, gap: 8 },
  title: { color: GAME_PALETTE.text, fontSize: 16, ...interFont('semibold') },
  hint: { color: GAME_PALETTE.textMuted, fontSize: 13, lineHeight: 19 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: 10, borderWidth: 1, borderColor: GAME_PALETTE.surfaceBorder, borderRadius: 10 },
  selected: { borderColor: GAME_PALETTE.accent, backgroundColor: GAME_PALETTE.surface },
  pressed: { opacity: 0.75 },
  copy: { flex: 1, gap: 2 },
  label: { color: GAME_PALETTE.text, fontSize: 14, ...interFont('semibold') },
  radio: { width: 18, height: 18, borderWidth: 2, borderColor: GAME_PALETTE.textMuted, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: GAME_PALETTE.accent },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GAME_PALETTE.accent },
});
