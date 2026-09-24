import type { StrategyKey } from '@/features/game/strategy';
import type { GameState } from '@/lib/game';
import { useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { classifyStrategy, pipCount } from '@/features/game/strategy';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
};

/** Muted glanceable dot per strategy — tasteful, not flashy. */
const STRATEGY_DOT: Record<StrategyKey, string> = {
  running: '#7BC98B',
  blitz: '#E08A6D',
  priming: '#8FA8D8',
  holding: '#D8C88F',
  backgame: '#C98F7B',
  developing: '#8A8A92',
};

/**
 * Slim status bar: the strategy the position points to (tap for the one-line
 * tip) plus both race pip counts. The leader's count is highlighted.
 */
export function GamePipStatusBar({ state }: Props) {
  const [showTip, setShowTip] = useState(false);
  const perspective = state.mode === 'vs-computer' ? 'white' as const : state.currentPlayer;
  const strategy = classifyStrategy(state, perspective);
  const whitePips = pipCount(state, 'white');
  const blackPips = pipCount(state, 'black');
  const gameOver = state.phase === 'game-over';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {!gameOver && (
          <Pressable
            onPress={() => setShowTip(t => !t)}
            accessibilityRole="button"
            accessibilityLabel={`${strategy.label}. ${strategy.tip}`}
            style={styles.strategyPill}
            testID="strategy-pill"
          >
            <View style={[styles.strategyDot, { backgroundColor: STRATEGY_DOT[strategy.key] }]} />
            <Text style={styles.strategyText}>{strategy.label}</Text>
          </Pressable>
        )}
        <View style={styles.pips}>
          <PipCount
            label={translate('game.review.player_white')}
            count={whitePips}
            dotColor="#F2EAD3"
            leading={whitePips <= blackPips}
          />
          <Text style={styles.pipDivider}>·</Text>
          <PipCount
            label={translate('game.review.player_black')}
            count={blackPips}
            dotColor="#1E1E30"
            leading={blackPips < whitePips}
          />
        </View>
        {gameOver && <Text style={styles.winnerBadge}>{getWinnerLabel(state)}</Text>}
      </View>
      {showTip && !gameOver && (
        <Text style={styles.tip}>{strategy.tip}</Text>
      )}
    </View>
  );
}

function PipCount({
  label,
  count,
  dotColor,
  leading,
}: {
  label: string;
  count: number;
  dotColor: string;
  leading: boolean;
}) {
  return (
    <View
      style={styles.pipItem}
      accessibilityLabel={`${label} pip count ${count}`}
    >
      <View style={[styles.pipDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.pipText, leading && styles.pipTextLeading]} selectable>
        {count}
      </Text>
    </View>
  );
}

function getWinnerLabel(state: GameState) {
  if (state.winner === 'white') {
    return state.mode === 'vs-computer'
      ? translate('game.status.you_win')
      : translate('game.status.white_wins');
  }
  return state.mode === 'vs-computer'
    ? translate('game.status.computer_wins')
    : translate('game.status.black_wins');
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 4,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strategyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...continuousRadius(999),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(232, 224, 208, 0.14)',
  },
  strategyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  strategyText: {
    color: GAME_PALETTE.text,
    fontSize: 12,
    letterSpacing: 0.4,
    ...interFont('semibold'),
  },
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  pipDivider: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
  },
  pipText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('regular'),
    fontVariant: ['tabular-nums'],
  },
  pipTextLeading: {
    color: GAME_PALETTE.text,
    ...interFont('semibold'),
  },
  tip: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    ...interFont('regular'),
  },
  winnerBadge: {
    color: '#E8C860',
    fontSize: 13,
    ...interFont('bold'),
  },
});
