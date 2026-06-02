import type { GameState } from '@/lib/game';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
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
  const caption = getCaption(state, isHumanTurn, isComputerTurn);

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

function getCaption(state: GameState, isHumanTurn: boolean, isComputerTurn: boolean) {
  if (state.phase === 'rolling' && isHumanTurn) {
    return 'Roll dice to begin your turn';
  }
  if (state.phase === 'rolling' && isComputerTurn) {
    return 'Opponent is rolling…';
  }
  if (state.phase === 'moving' && isComputerTurn) {
    return 'Opponent is moving…';
  }
  if (state.phase === 'moving' && isHumanTurn) {
    if (state.selectedPoint !== null) {
      return 'Tap a highlighted point';
    }
    return 'Tap one of your checkers';
  }
  return ' ';
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

  if (state.phase === 'rolling' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
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
    fontWeight: '600',
    fontFamily: 'Inter_700Bold',
  },
  statusSlot: {
    height: ACTION_SLOT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  caption: {
    marginTop: 6,
    minHeight: 18,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
