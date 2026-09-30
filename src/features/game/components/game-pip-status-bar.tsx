import type { StrategyKey } from '@/features/game/strategy';
import type { GameState } from '@/lib/game';

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
 * Quiet status line: the strategy the position points to (tap for why + tip)
 * and both race pip counts. Deliberately bubble-free — it reads as part of
 * the header, not a floating badge.
 */
export function GamePipStatusBar({ state }: Props) {
  const [showExplanation, setShowExplanation] = useState(false);
  const perspective = state.mode === 'vs-computer' ? 'white' as const : state.currentPlayer;
  const strategy = classifyStrategy(state, perspective);
  const whitePips = pipCount(state, 'white');
  const blackPips = pipCount(state, 'black');
  const gameOver = state.phase === 'game-over';

  if (gameOver) {
    return (
      <View style={styles.wrap}>
        <View style={styles.gameOverWrap}>
          <Text style={styles.winnerBadge}>{getWinnerLabel(state)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setShowExplanation(true)}
          accessibilityRole="button"
          accessibilityLabel={`${strategy.label}. ${strategy.why} ${strategy.tip}`}
          style={styles.strategyRow}
          testID="strategy-line"
        >
          <View style={[styles.strategyDot, { backgroundColor: STRATEGY_DOT[strategy.key] }]} />
          <Text style={styles.strategyText}>{strategy.label}</Text>
          <Text style={styles.chevron}>▸</Text>
        </Pressable>
        <View style={styles.pips}>
          <View style={[styles.pipDot, { backgroundColor: '#E8E0D0' }]} />
          <Text style={styles.pipText} accessibilityLabel={`${translate('game.review.player_white')} pip count ${whitePips}`}>
            {whitePips}
          </Text>
          <Text style={styles.pipDivider}>–</Text>
          <View style={[styles.pipDot, { backgroundColor: '#2A2A2E' }]} />
          <Text style={styles.pipText} accessibilityLabel={`${translate('game.review.player_black')} pip count ${blackPips}`}>
            {blackPips}
          </Text>
        </View>
      </View>
      <Modal
        visible={showExplanation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplanation(false)}
      >
        <Pressable
          style={styles.modalScrim}
          onPress={() => setShowExplanation(false)}
          testID="strategy-explanation-scrim"
        >
          <Pressable style={styles.modalCard} onPress={() => {}} testID="strategy-explanation">
            <View style={styles.modalHeader}>
              <View style={[styles.strategyDot, { backgroundColor: STRATEGY_DOT[strategy.key] }]} />
              <Text style={styles.modalTitle}>{strategy.label}</Text>
            </View>
            <Text style={styles.whyText}>{strategy.why}</Text>
            <Text style={styles.tipText}>{strategy.tip}</Text>
            <Pressable
              onPress={() => setShowExplanation(false)}
              accessibilityRole="button"
              accessibilityLabel="Close strategy explanation"
              style={styles.modalClose}
              testID="strategy-explanation-close"
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 16,
    marginBottom: 2,
    gap: 6,
  },
  gameOverWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  winnerBadge: {
    color: '#E8C860',
    fontSize: 20,
    letterSpacing: 0.5,
    ...interFont('bold'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strategyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  strategyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  strategyText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    ...interFont('medium'),
  },
  chevron: {
    color: GAME_PALETTE.textMuted,
    opacity: 0.6,
    fontSize: 10,
  },
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(232, 224, 208, 0.4)',
  },
  pipDivider: {
    color: GAME_PALETTE.textMuted,
    opacity: 0.5,
    fontSize: 11,
  },
  pipText: {
    color: GAME_PALETTE.textMuted,
    opacity: 0.85,
    fontSize: 12,
    ...interFont('regular'),
    fontVariant: ['tabular-nums'],
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    padding: 20,
    maxWidth: 340,
    width: '100%',
    gap: 10,
    ...continuousRadius(16),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: GAME_PALETTE.text,
    fontSize: 17,
    ...interFont('semibold'),
  },
  whyText: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('regular'),
  },
  tipText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('regular'),
  },
  modalClose: {
    marginTop: 6,
    backgroundColor: GAME_PALETTE.accent,
    paddingVertical: 10,
    alignItems: 'center',
    ...continuousRadius(10),
  },
  modalCloseText: {
    color: GAME_PALETTE.bg,
    fontSize: 15,
    ...interFont('semibold'),
  },
});
