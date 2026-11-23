import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FocusAwareStatusBar, ScrollView, Text } from '@/components/ui';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { rollDice } from '@/lib/game/moves';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { useLayoutMetrics } from '@/lib/ui/layout-metrics';

/** A pair of dice for a physical board, independent of any saved game. */
export function DiceScreen() {
  const [roll, setRoll] = useState<{ dice: [number, number]; count: number }>({ dice: [0, 0], count: 0 });
  const { width, insets } = useLayoutMetrics();
  const result = roll.count === 0
    ? translate('dice.ready')
    : translate('dice.result', { count: roll.count, first: roll.dice[0], second: roll.dice[1] });

  function handleRoll() {
    const dice = rollDice();
    setRoll(previous => ({ dice, count: previous.count + 1 }));
    hapticLight();
  }

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="dice-screen"
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <Text style={styles.hint}>{translate('dice.hint')}</Text>
        <View style={styles.dice} accessible accessibilityLabel={result}>
          <DiceDisplay
            key={roll.count}
            dice={roll.dice}
            remainingDice={roll.dice}
            playerColor="white"
            slotColors={['white', 'white']}
            size={Math.min(112, (width - 80) / 2)}
          />
        </View>
        <Text testID="dice-result" accessibilityLiveRegion="polite" style={styles.result}>{result}</Text>
        <HoverPressable
          testID="standalone-roll-button"
          accessibilityRole="button"
          accessibilityLabel={translate('dice.title')}
          onPress={handleRoll}
          style={({ pressed, hovered }) => [
            styles.button,
            hovered && styles.hovered,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>{translate('dice.title')}</Text>
        </HoverPressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GAME_PALETTE.bg },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 32, gap: 32 },
  hint: { color: GAME_PALETTE.textMuted, fontSize: 16, textAlign: 'center', ...interFont('regular') },
  dice: { paddingVertical: 16 },
  result: { color: GAME_PALETTE.text, fontSize: 20, textAlign: 'center', ...interFont('semibold') },
  button: { width: '100%', maxWidth: 440, minHeight: 64, padding: 20, borderRadius: 16, backgroundColor: GAME_PALETTE.control, alignItems: 'center', justifyContent: 'center' },
  hovered: { backgroundColor: GAME_PALETTE.controlHover },
  pressed: { opacity: 0.85 },
  buttonText: { color: GAME_PALETTE.controlInk, fontSize: 20, ...interFont('bold') },
});
