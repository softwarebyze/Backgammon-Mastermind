import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { FONT_REGULAR } from '@/lib/ui/fonts';

type Props = {
  state: GameState;
};

export function GamePipStatusBar({ state }: Props) {
  return (
    <View style={styles.pipRow}>
      <PipCount label="White" count={state.borneOff.white} dotColor="#F2EAD3" />
      <PipCount label="Black" count={state.borneOff.black} dotColor="#1E1E30" />
      {state.phase === 'game-over'
        ? (
            <Text style={styles.winnerBadge}>{getWinnerLabel(state)}</Text>
          )
        : null}
    </View>
  );
}

function PipCount({ label, count, dotColor }: { label: string; count: number; dotColor: string }) {
  return (
    <View style={styles.pipItem}>
      <View style={[styles.pipDot, { backgroundColor: dotColor }]} />
      <Text style={styles.pipText} selectable>
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
    return state.mode === 'vs-computer' ? '🏆 You Win!' : '🏆 White Wins!';
  }
  return state.mode === 'vs-computer' ? 'Computer Wins' : 'Black Wins';
}

const styles = StyleSheet.create({
  pipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
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
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    fontVariant: ['tabular-nums'],
  },
  winnerBadge: {
    color: '#E8C860',
    fontSize: 13,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
});
