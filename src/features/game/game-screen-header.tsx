import type { GameState } from '@/lib/game';
import { Feather } from '@expo/vector-icons';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  state: GameState;
  playerLabel: string;
  onBack: () => void;
  onReset: () => void;
};

export function GameScreenHeader({ state, playerLabel, onBack, onReset }: Props) {
  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.iconBtn}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={22} color="#D4A843" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View
            style={[
              styles.playerBadge,
              { backgroundColor: state.currentPlayer === 'white' ? '#F2EAD3' : '#1E1E30' },
            ]}
          />
          <Text style={styles.headerTitle}>{playerLabel}</Text>
          {state.phase === 'game-over' && (
            <Text style={styles.winnerBadge}>{getWinnerLabel(state)}</Text>
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Start new game"
          onPress={onReset}
          style={styles.iconBtn}
          hitSlop={12}
        >
          <Feather name="refresh-cw" size={20} color="#D4A843" />
        </TouchableOpacity>
      </View>

      <View style={styles.pipRow}>
        <PipCount label="White" count={state.borneOff.white} dotColor="#F2EAD3" />
        <PipCount label="Black" count={state.borneOff.black} dotColor="#1E1E30" />
      </View>
    </>
  );
}

function PipCount({ label, count, dotColor }: { label: string; count: number; dotColor: string }) {
  return (
    <View style={styles.pipItem}>
      <View style={[styles.pipDot, { backgroundColor: dotColor }]} />
      <Text style={styles.pipText}>
        {label}
        :
        {count}
        /15
      </Text>
    </View>
  );
}

function getWinnerLabel(state: GameState) {
  if (state.winner === 'white') {
    return state.mode === 'vs-computer' ? ' 🏆 You Win!' : ' 🏆 White Wins!';
  }
  return state.mode === 'vs-computer' ? ' Computer Wins' : ' Black Wins';
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#D4A843',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  winnerBadge: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  playerBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#BBA070',
  },
  iconBtn: {
    padding: 8,
  },
  pipRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  pipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BBA070',
  },
  pipText: {
    color: '#A08060',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
