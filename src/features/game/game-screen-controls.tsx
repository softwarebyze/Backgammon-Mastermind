import type { GameState } from '@/lib/game';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { getActionCaption, getTurnDisplay } from '@/lib/game/turn-display';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  onRoll: () => void;
  onReset: () => void;
};

const ACTION_SLOT_HEIGHT = 52;

export function GameScreenControls({
  state,
  isHumanTurn,
  isComputerTurn,
  onRoll,
  onReset,
}: Props) {
  const { preferences } = useGamePreferences();
  const turn = getTurnDisplay(state);
  const caption = getActionCaption(state, turn);

  return (
    <View style={styles.controls}>
      <View style={styles.diceRow}>
        <DiceDisplay
          dice={state.dice}
          remainingDice={state.remainingDice}
          playerColor={state.currentPlayer}
          displayStyle={preferences.diceDisplayStyle}
        />
      </View>
      <View style={styles.actionSlot}>
        <ActionControl
          state={state}
          isHumanTurn={isHumanTurn}
          isComputerTurn={isComputerTurn}
          onRoll={() => {
            hapticLight();
            onRoll();
          }}
          onReset={() => {
            hapticLight();
            onReset();
          }}
        />
      </View>
      <Text style={styles.caption} numberOfLines={2}>
        {caption || ' '}
      </Text>
    </View>
  );
}

function ActionControl({
  state,
  isHumanTurn,
  isComputerTurn,
  onRoll,
  onReset,
}: Props) {
  if (state.phase === 'game-over') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play again"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onReset}
      >
        <Text style={styles.primaryBtnText}>Play Again</Text>
      </Pressable>
    );
  }

  if (state.phase === 'opening-roll' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll for opening"
        testID="roll-dice-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onRoll}
      >
        <Text style={styles.primaryBtnText}>Roll Dice</Text>
      </Pressable>
    );
  }

  if (state.phase === 'opening-roll' && isComputerTurn) {
    return <StatusPlaceholder text="Rolling for opening…" />;
  }

  if (state.phase === 'rolling' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
        testID="roll-dice-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onRoll}
      >
        <Text style={styles.primaryBtnText}>Roll Dice</Text>
      </Pressable>
    );
  }

  if (state.phase === 'rolling' && isComputerTurn) {
    return <StatusPlaceholder text="Rolling…" />;
  }

  if (state.phase === 'moving' && isComputerTurn) {
    return <StatusPlaceholder text="Moving…" />;
  }

  return <View style={styles.actionSpacer} />;
}

function StatusPlaceholder({ text }: { text: string }) {
  return (
    <View style={styles.statusSlot}>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 8,
  },
  actionSlot: {
    height: ACTION_SLOT_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSpacer: {
    height: ACTION_SLOT_HEIGHT,
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: GAME_PALETTE.control,
    borderWidth: 1,
    borderColor: GAME_PALETTE.controlBorder,
    paddingHorizontal: 40,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    ...continuousRadius(12),
  },
  pressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('semibold'),
  },
  statusSlot: {
    height: ACTION_SLOT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 15,
    ...interFont('regular'),
  },
  caption: {
    marginTop: 6,
    minHeight: 18,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    ...interFont('regular'),
  },
});
