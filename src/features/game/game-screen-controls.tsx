import type { GameState } from '@/lib/game';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DiceDisplay } from '@/features/game/components/board/DiceDisplay';

type Props = {
  state: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  onRoll: () => void;
  onReset: () => void;
};

export function GameScreenControls({
  state,
  isHumanTurn,
  isComputerTurn,
  onRoll,
  onReset,
}: Props) {
  return (
    <View style={styles.controls}>
      <View style={styles.diceRow}>
        <DiceDisplay
          dice={state.dice}
          remainingDice={state.remainingDice}
          playerColor={state.currentPlayer}
        />
      </View>
      <ActionButton
        state={state}
        isHumanTurn={isHumanTurn}
        isComputerTurn={isComputerTurn}
        onRoll={onRoll}
        onReset={onReset}
      />
    </View>
  );
}

function ActionButton({ state, isHumanTurn, isComputerTurn, onRoll, onReset }: Props) {
  if (state.phase === 'game-over') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Play again"
        style={styles.rollBtn}
        onPress={onReset}
      >
        <Text style={styles.rollBtnText}>Play Again</Text>
      </TouchableOpacity>
    );
  }

  if (state.phase === 'rolling') {
    if (isHumanTurn) {
      return (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Roll dice"
          style={styles.rollBtn}
          onPress={onRoll}
        >
          <Text style={styles.rollBtnText}>Roll Dice</Text>
        </TouchableOpacity>
      );
    }
    return <StatusButton text="Computer Rolling…" />;
  }

  if (state.phase === 'moving') {
    if (isComputerTurn) {
      return <StatusButton text="Computer Moving…" />;
    }
    return (
      <View style={[styles.rollBtn, styles.hintBtn]}>
        <Text style={[styles.rollBtnText, styles.hintText]}>
          {state.selectedPoint !== null
            ? 'Tap a highlighted point to move'
            : 'Select a checker to move'}
        </Text>
      </View>
    );
  }

  return null;
}

function StatusButton({ text }: { text: string }) {
  return (
    <View style={[styles.rollBtn, styles.mutedBtn]}>
      <Text style={[styles.rollBtnText, styles.mutedText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  diceRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    minHeight: 50,
  },
  rollBtn: {
    backgroundColor: '#8B1A1A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C83030',
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  rollBtnText: {
    color: '#F2EAD3',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  mutedBtn: {
    backgroundColor: '#3A2010',
    borderColor: '#5A3020',
  },
  mutedText: {
    color: '#8A6040',
  },
  hintBtn: {
    backgroundColor: '#2A3A20',
    borderColor: '#4A6A30',
  },
  hintText: {
    color: '#A0D080',
  },
});
