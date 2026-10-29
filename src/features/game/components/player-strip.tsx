import type { GameState, Player } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/ui/animated-number';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { StrategyChip } from '@/features/game/components/strategy-chip';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { strategyPerspective } from '@/features/game/strategy';
import { calculatePipCount } from '@/lib/game';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import { playerDisplayName, playerStripStatus } from './player-strip-copy';

const TOKEN_SIZE = 26;

type Props = {
  state: GameState;
  player: Player;
  /** Opening copy ("Who goes first?", "White goes first!") replaces the turn status. */
  headlineOverride?: string | null;
  /** Narrow landscape rail: the strategy chip shrinks to its mark. */
  compact?: boolean;
};

/**
 * One side of the table: who is sitting there, whether it is their turn, how
 * far they have to go (pip count) and how many checkers are already off.
 * Black sits above the board and white below it, like the checkers.
 */
export function PlayerStrip({ state, player, headlineOverride = null, compact = false }: Props) {
  const name = playerDisplayName(state, player);
  const status = playerStripStatus(state, player, headlineOverride);
  const gameOver = state.phase === 'game-over';
  const active = gameOver ? state.winner === player : state.currentPlayer === player;
  const won = gameOver && state.winner === player;
  const pips = calculatePipCount(state, player);
  const off = state.borneOff[player];
  const showStrategy = !gameOver && strategyPerspective(state) === player;
  const pipsA11y = translate('game.status.pips_a11y', { player: name, pips, off });

  return (
    <View
      testID={`player-strip-${player}`}
      style={[styles.strip, active && styles.stripActive, won && styles.stripWon]}
    >
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={status ? `${name}. ${status}` : name}
        style={styles.identity}
      >
        <View style={[styles.tokenRing, active && styles.tokenRingActive]}>
          <CheckerToken player={player} size={TOKEN_SIZE} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.name, !active && styles.nameIdle]} numberOfLines={1}>
            {name}
          </Text>
          {status
            ? (
                <Animated.View key={status} entering={FadeIn.duration(180)}>
                  <Text
                    style={[styles.status, won && styles.statusWon]}
                    numberOfLines={1}
                    testID={`player-status-${player}`}
                  >
                    {status}
                  </Text>
                </Animated.View>
              )
            : null}
        </View>
      </View>
      {showStrategy ? <StrategyChip state={state} iconOnly={compact} /> : null}
      <View style={styles.score} accessible accessibilityLabel={pipsA11y} testID={`pip-count-${player}`}>
        <AnimatedNumber value={pips} style={[styles.pips, !active && styles.pipsIdle]} />
        <Text style={styles.scoreLabel} numberOfLines={1}>
          {off > 0
            ? `${off} ${translate('game.status.off_short')}`
            : translate('game.players.pips')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 52,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    ...continuousRadius(14),
  },
  stripActive: {
    backgroundColor: GAME_PALETTE.surface,
    borderColor: 'rgba(255, 152, 76, 0.45)',
  },
  stripWon: {
    borderColor: '#E8C860',
  },
  // Name and status keep their width; the strategy chip gives way first.
  identity: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tokenRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tokenRingActive: {
    borderColor: GAME_PALETTE.accent,
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  nameIdle: {
    color: GAME_PALETTE.textMuted,
  },
  status: {
    marginTop: 1,
    color: GAME_PALETTE.accentDim,
    fontSize: 12.5,
    ...interFont('medium'),
  },
  statusWon: {
    color: '#E8C860',
  },
  score: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  pips: {
    color: GAME_PALETTE.text,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    ...interFont('semibold'),
  },
  pipsIdle: {
    color: GAME_PALETTE.textMuted,
  },
  scoreLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    ...interFont('medium'),
  },
});
