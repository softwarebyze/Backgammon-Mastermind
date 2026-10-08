import type { StrategyKey } from '@/features/game/strategy';
import type { GameState } from '@/lib/game';
import type { TxKeyPath } from '@/lib/i18n';

import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { StrategyMark } from '@/features/game/components/strategy-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { getS1Variants } from '@/features/game/s1-prototype';
import { classifyStrategy } from '@/features/game/strategy';
import { calculatePipCount } from '@/lib/game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { isRTL, translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
};

const PIP_TOKEN = 14;

/** Pip pair drawn with real checker tokens, so the colour reads as a checker, not a stray dot. */
function PipPair({ whitePips, blackPips }: { whitePips: number; blackPips: number }) {
  return (
    <View style={styles.pips} testID="pip-pair">
      <CheckerToken player="white" size={PIP_TOKEN} flat />
      <Text style={styles.pipTextStrong} accessibilityLabel={`${translate('game.review.player_white')} pip count ${whitePips}`}>
        {whitePips}
      </Text>
      <Text style={styles.pipDivider}>–</Text>
      <CheckerToken player="black" size={PIP_TOKEN} flat />
      <Text style={styles.pipTextStrong} accessibilityLabel={`${translate('game.review.player_black')} pip count ${blackPips}`}>
        {blackPips}
      </Text>
    </View>
  );
}

type ChipProps = {
  strategyKey: StrategyKey;
  label: string;
  a11y: string;
  tutorOn: boolean;
  onPress: () => void;
};

/**
 * Option A — a filled, bordered pill. The pill shape itself says "button";
 * a small accent info glyph says "tap for why"; Tutor-on is a state of the
 * same pill (book icon behind a hairline), not a second element.
 */
function StrategyChipA({ strategyKey, label, a11y, tutorOn, onPress }: ChipProps) {
  return (
    <HoverPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={({ pressed, hovered }) => [
        styles.chipA,
        hovered && styles.chipAHover,
        pressed && styles.chipAPressed,
      ]}
      testID="strategy-line"
    >
      <View testID="strategy-mark">
        <StrategyMark strategy={strategyKey} size={16} />
      </View>
      <Text style={styles.chipALabel} numberOfLines={1}>{label}</Text>
      <Feather name="info" size={14} color={GAME_PALETTE.accent} />
      {tutorOn && (
        <View style={styles.chipATutor} testID="tutor-on-indicator">
          <View style={styles.chipADivider} />
          <Feather name="book-open" size={13} color={GAME_PALETTE.accent} />
        </View>
      )}
    </HoverPressable>
  );
}

/**
 * Option B — quiet text line (as today) but with an explicit accent "Why?"
 * link as the affordance, and Tutor-on as a lettered micro-tag.
 */
function StrategyChipB({ strategyKey, label, a11y, tutorOn, onPress }: ChipProps) {
  return (
    <HoverPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      style={({ pressed }) => [styles.chipB, pressed && styles.chipBPressed]}
      testID="strategy-line"
    >
      <View testID="strategy-mark">
        <StrategyMark strategy={strategyKey} size={16} />
      </View>
      <Text style={styles.chipBLabel} numberOfLines={1}>{label}</Text>
      {tutorOn && (
        <View style={styles.chipBTutorTag} testID="tutor-on-indicator">
          <Text style={styles.chipBTutorTagText}>TUTOR</Text>
        </View>
      )}
      <Text style={styles.chipBWhy}>Why?</Text>
    </HoverPressable>
  );
}

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
  const { preferences } = useGamePreferences();
  const variant = getS1Variants().status;
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

  const tutorOn = preferences.tutorMode;
  const a11y = `${label}. ${why} ${tip}${tutorOn ? ' Tutor mode is on.' : ''}`;
  const open = () => setShowExplanation(true);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {variant === 'a' && (
          <StrategyChipA strategyKey={strategy.key} label={label} a11y={a11y} tutorOn={tutorOn} onPress={open} />
        )}
        {variant === 'b' && (
          <StrategyChipB strategyKey={strategy.key} label={label} a11y={a11y} tutorOn={tutorOn} onPress={open} />
        )}
        {variant === 'today' && (
          <Pressable
            onPress={open}
            accessibilityRole="button"
            accessibilityLabel={`${label}. ${why} ${tip}`}
            style={styles.strategyRow}
            testID="strategy-line"
          >
            <View testID="strategy-mark">
              <StrategyMark strategy={strategy.key} size={18} />
            </View>
            <Text style={styles.strategyText}>{label}</Text>
            <Text style={styles.chevron}>{isRTL ? '◂' : '▸'}</Text>
          </Pressable>
        )}
        {variant === 'today'
          ? (
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
            )
          : <PipPair whitePips={whitePips} blackPips={blackPips} />}
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
  pipTextStrong: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    ...interFont('medium'),
    fontVariant: ['tabular-nums'],
  },
  // Option A — filled pill
  chipA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingLeft: 8,
    paddingRight: 10,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(999),
    flexShrink: 1,
  },
  chipAHover: {
    borderColor: GAME_PALETTE.accentDim,
  },
  chipAPressed: {
    backgroundColor: GAME_PALETTE.pillPressedFill,
    borderColor: GAME_PALETTE.accent,
  },
  chipALabel: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    ...interFont('semibold'),
    flexShrink: 1,
  },
  chipATutor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipADivider: {
    width: 1,
    height: 14,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
  // Option B — text line + Why link
  chipB: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    flexShrink: 1,
  },
  chipBPressed: {
    opacity: 0.7,
  },
  chipBLabel: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    ...interFont('medium'),
    flexShrink: 1,
  },
  chipBWhy: {
    color: GAME_PALETTE.accent,
    fontSize: 12,
    ...interFont('semibold'),
  },
  chipBTutorTag: {
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    paddingHorizontal: 5,
    paddingVertical: 1,
    ...continuousRadius(4),
  },
  chipBTutorTagText: {
    color: GAME_PALETTE.accentDim,
    fontSize: 9,
    letterSpacing: 1,
    ...interFont('semibold'),
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
