import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
};

export function GamePipStatusBar({ state }: Props) {
  const activePlayer
    = state.phase === 'game-over' ? null : state.currentPlayer;

  return (
    <View style={styles.pipRow}>
      <PipCount
        label="White"
        count={state.borneOff.white}
        dotColor="#F2EAD3"
        isActive={activePlayer === 'white'}
      />
      <PipCount
        label="Black"
        count={state.borneOff.black}
        dotColor="#1E1E30"
        isActive={activePlayer === 'black'}
      />
      {state.phase === 'game-over'
        ? (
            <Text style={styles.winnerBadge}>{getWinnerLabel(state)}</Text>
          )
        : null}
    </View>
  );
}

function PipCount({
  label,
  count,
  dotColor,
  isActive,
}: {
  label: string;
  count: number;
  dotColor: string;
  isActive: boolean;
}) {
  return (
    <View style={[styles.pipItem, isActive && styles.pipItemActive]}>
      <View style={[styles.pipDot, { backgroundColor: dotColor }, isActive && styles.pipDotActive]} />
      <Text style={[styles.pipText, isActive && styles.pipTextActive]} selectable>
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
    gap: 12,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  pipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...continuousRadius(10),
  },
  pipItemActive: {
    backgroundColor: 'rgba(232, 200, 96, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 96, 0.35)',
  },
  pipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BBA070',
  },
  pipDotActive: {
    borderColor: '#E8C860',
    borderWidth: 1.5,
  },
  pipText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('regular'),
    fontVariant: ['tabular-nums'],
  },
  pipTextActive: {
    color: GAME_PALETTE.text,
    ...interFont('semibold'),
  },
  winnerBadge: {
    color: '#E8C860',
    fontSize: 13,
    ...interFont('bold'),
    width: '100%',
    textAlign: 'center',
  },
});
