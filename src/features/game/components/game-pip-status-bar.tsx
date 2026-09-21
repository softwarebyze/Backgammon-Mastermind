import type { GameState, Player } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { calculatePipCount } from '@/lib/game/moves';
import { playerLabel } from '@/lib/game/turn-display';
import { translate } from '@/lib/i18n';
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
        player="white"
        state={state}
        dotColor="#F2EAD3"
        isActive={activePlayer === 'white'}
      />
      <PipCount
        player="black"
        state={state}
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

/**
 * Pip count is the racing metric players actually read; borne-off only
 * matters once someone starts bearing off, so it appears then.
 */
function PipCount({
  player,
  state,
  dotColor,
  isActive,
}: {
  player: Player;
  state: GameState;
  dotColor: string;
  isActive: boolean;
}) {
  const label = playerLabel(player);
  const pips = calculatePipCount(state, player);
  const off = state.borneOff[player];
  return (
    <View
      style={[styles.pipItem, isActive && styles.pipItemActive]}
      accessibilityRole="text"
      accessibilityLabel={translate('game.status.pips_a11y', { player: label, pips, off })}
    >
      <View style={[styles.pipDot, { backgroundColor: dotColor }, isActive && styles.pipDotActive]} />
      <Text style={[styles.pipText, isActive && styles.pipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.pipNumber, isActive && styles.pipTextActive]}>{pips}</Text>
      {off > 0
        ? (
            <Text style={[styles.pipText, isActive && styles.pipTextActive]}>
              {`· ${off} ${translate('game.status.off_short')}`}
            </Text>
          )
        : null}
    </View>
  );
}

function getWinnerLabel(state: GameState) {
  if (state.winner === 'white') {
    return translate(state.mode === 'vs-computer' ? 'game.status.you_win' : 'game.status.white_wins');
  }
  return translate(state.mode === 'vs-computer' ? 'game.status.computer_wins' : 'game.status.black_wins');
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
  pipNumber: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('semibold'),
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
