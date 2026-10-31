import type { ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { GameState, Player } from '@/lib/game';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/ui/animated-number';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { StrategyChip } from '@/features/game/components/strategy-chip';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { classifyStrategy } from '@/features/game/strategy';
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
  /** Makes the name a button (the position editor sets who is on roll). */
  onPress?: () => void;
  pressHint?: string;
  /** Replaces the match score, e.g. with an editable one. */
  trailing?: ReactNode;
  /** The position editor has no plan to show. */
  hideStrategy?: boolean;
  /** Shown, muted, when this side is just waiting ("Tap to put on roll"). */
  idleStatus?: string;
};

/**
 * One side of the table: who is sitting there, whether it is their turn, how
 * far they have to go (pip count) and how many checkers are already off.
 * Black sits above the board and white below it, like the checkers.
 */
export function PlayerStrip({ state, player, headlineOverride = null, compact = false, onPress, pressHint, trailing, hideStrategy = false, idleStatus }: Props) {
  const name = playerDisplayName(state, player);
  const turnStatus = playerStripStatus(state, player, headlineOverride);
  const status = turnStatus ?? idleStatus ?? null;
  const gameOver = state.phase === 'game-over';
  const active = gameOver ? state.winner === player : state.currentPlayer === player;
  const won = gameOver && state.winner === player;
  const pips = calculatePipCount(state, player);
  const off = state.borneOff[player];
  // Both sides get their plan, the computer's included. The opening is not a
  // plan yet, so the chip waits until one takes shape.
  const showStrategy = !hideStrategy && !gameOver && classifyStrategy(state, player).key !== 'developing';
  const pipsA11y = translate('game.status.pips_a11y', { player: name, pips, off });
  // Narrow strips (small phones, and matches with their score column) show the
  // plan as its mark alone, so the name and status never get cut off. The
  // landscape side rail is narrower still: see the two-row layout below.
  const [width, setWidth] = useState(0);
  const narrow = width > 0 && width < (state.match ? 420 : 340);
  const tight = width > 0 && width < (state.match ? 280 : 220);

  // Only the name is pressable, so an editable trailing score never nests buttons.
  const Identity = onPress ? Pressable : View;
  const statusText = status
    ? (
        <Animated.View key={status} entering={FadeIn.duration(180)}>
          <Text
            style={[styles.status, won && styles.statusWon, !turnStatus && styles.statusIdle]}
            testID={`player-status-${player}`}
          >
            {status}
          </Text>
        </Animated.View>
      )
    : null;
  const identity = (
    <Identity
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={status ? `${name}. ${status}` : name}
      style={styles.identity}
      testID={`player-name-${player}`}
      {...(onPress ? { onPress, accessibilityHint: pressHint, accessibilityState: { selected: active } } : null)}
    >
      <View style={[styles.tokenRing, active && styles.tokenRingActive]}>
        <CheckerToken player={player} size={TOKEN_SIZE} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, !active && styles.nameIdle]}>
          {name}
        </Text>
        {tight ? null : statusText}
      </View>
    </Identity>
  );
  const pipCount = <PipCount player={player} pips={pips} off={off} active={active} label={pipsA11y} inline={tight} />;
  const score = trailing ?? (state.match ? <MatchScore score={state.match.score[player]} length={state.match.length} player={player} /> : null);
  const stripStyle = [styles.strip, active && styles.stripActive, won && styles.stripWon];
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // The side rail is too narrow for one row: the name keeps the top line with
  // the score, and the status and pips share the line under it.
  if (tight) {
    return (
      <View testID={`player-strip-${player}`} style={[stripStyle, styles.stripTight]} onLayout={onLayout}>
        <View style={styles.tightRow}>
          {identity}
          {score}
        </View>
        <View style={[styles.tightRow, styles.tightDetail]}>
          <View style={styles.tightStatus}>{statusText}</View>
          {pipCount}
        </View>
      </View>
    );
  }
  return (
    <View testID={`player-strip-${player}`} style={stripStyle} onLayout={onLayout}>
      {identity}
      {showStrategy ? <StrategyChip state={state} player={player} iconOnly={compact || narrow} /> : null}
      {pipCount}
      {score}
    </View>
  );
}

/** How far a side has to go, or how many checkers it has already borne off. */
function PipCount({ player, pips, off, active, label, inline }: {
  player: Player;
  pips: number;
  off: number;
  active: boolean;
  label: string;
  /** One line ("167 PIPS") for the side rail's second row. */
  inline: boolean;
}) {
  return (
    <View style={inline ? styles.scoreInline : styles.score} accessible accessibilityLabel={label} testID={`pip-count-${player}`}>
      <AnimatedNumber value={pips} style={[styles.pips, inline && styles.pipsInline, !active && styles.pipsIdle]} />
      <Text style={styles.scoreLabel} numberOfLines={1}>
        {off > 0
          ? `${off} ${translate('game.status.off_short')}`
          : translate('game.players.pips')}
      </Text>
    </View>
  );
}

/** Points won so far in a match, against the length played to. */
function MatchScore({ score, length, player }: { score: number; length: number; player: Player }) {
  return (
    <View style={styles.matchScore} testID={`match-score-${player}`} accessible accessibilityLabel={translate('game.players.match_score_a11y', { score, length })}>
      <Text style={styles.matchScoreValue}>{score}</Text>
      <Text style={styles.scoreLabel}>{translate('game.players.match_to', { length })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  matchScore: {
    alignItems: 'center',
    minWidth: 40,
    paddingLeft: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255, 196, 153, 0.25)',
  },
  matchScoreValue: {
    color: GAME_PALETTE.accent,
    fontSize: 22,
    lineHeight: 26,
    ...interFont('bold'),
  },
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
  stripTight: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 2,
  },
  tightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Lines the status up under the name, past the token.
  tightDetail: {
    paddingLeft: TOKEN_SIZE + 17,
  },
  tightStatus: {
    flex: 1,
    minWidth: 0,
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
  statusIdle: {
    color: GAME_PALETTE.textMuted,
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
  scoreInline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pipsInline: {
    fontSize: 14,
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
