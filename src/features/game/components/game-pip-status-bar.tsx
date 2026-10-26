import type { StrategyKey } from '@/features/game/strategy';
import type { GameState } from '@/lib/game';
import type { TxKeyPath } from '@/lib/i18n';

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StrategyMark } from '@/features/game/components/strategy-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { classifyStrategy } from '@/features/game/strategy';
import { calculatePipCount } from '@/lib/game';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
};

/** Resolve `game.strategy.<group>.<strategyKey>` without losing key typing. */
function strategyMessage(group: 'label' | 'tip', key: StrategyKey) {
  return translate(`game.strategy.${group}.${key}` as TxKeyPath);
}

/**
 * Quiet status line: the strategy the position points to (tap for why + tip)
 * and both race pip counts. Deliberately bubble-free — it reads as part of
 * the header, not a floating badge.
 */
export function GamePipStatusBar({ state }: Props) {
  const [showExplanation, setShowExplanation] = useState(false);
  const perspective = state.mode === 'vs-computer' ? 'white' as const : state.currentPlayer;
  const strategy = classifyStrategy(state, perspective);
  const label = strategyMessage('label', strategy.key);
  const tip = strategyMessage('tip', strategy.key);
  const why = translate(
    `game.strategy.why.${strategy.reason.message}` as TxKeyPath,
    strategy.reason.params,
  );
  const whitePips = calculatePipCount(state, 'white');
  const blackPips = calculatePipCount(state, 'black');
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
          accessibilityLabel={`${label}. ${why} ${tip}`}
          style={styles.strategyRow}
          testID="strategy-line"
        >
          <View testID="strategy-mark" style={styles.strategyMark}>
            <StrategyMark strategy={strategy.key} size={18} />
          </View>
          <Text style={styles.strategyText}>{label}</Text>
        </Pressable>
        <View style={styles.pips} testID="pip-counts">
          <PlayerPips player="black" count={blackPips} />
          <PlayerPips player="white" count={whitePips} />
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
              <StrategyMark strategy={strategy.key} size={22} />
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            <Text style={styles.whyText}>{why}</Text>
            <Text style={styles.tipText}>{tip}</Text>
            <Pressable
              onPress={() => setShowExplanation(false)}
              accessibilityRole="button"
              accessibilityLabel={translate('game.strategy.close_a11y')}
              style={styles.modalClose}
              testID="strategy-explanation-close"
            >
              <Text style={styles.modalCloseText}>{translate('game.strategy.got_it')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PlayerPips({ player, count }: { player: 'black' | 'white'; count: number }) {
  return (
    <View style={styles.pipRow}>
      <View style={[styles.pipDot, { backgroundColor: player === 'black' ? '#2A2A2E' : '#E8E0D0' }]} />
      <Text
        testID={`pip-count-${player}`}
        style={styles.pipText}
        accessibilityLabel={`${translate(`game.review.player_${player}`)} pip count ${count}`}
      >
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
    gap: 16,
  },
  strategyRow: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  strategyMark: {
    flexShrink: 0,
  },
  strategyText: {
    flexShrink: 1,
    lineHeight: 16,
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    ...interFont('medium'),
  },
  pips: {
    flexShrink: 0,
    minWidth: 44,
    gap: 4,
  },
  pipRow: {
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
  pipText: {
    lineHeight: 16,
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
