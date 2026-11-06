import type { StrategyKey } from '@/features/game/strategy';
import type { GameState, Player } from '@/lib/game';
import type { TxKeyPath } from '@/lib/i18n';

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/scaled-text';
import { StrategyMark } from '@/features/game/components/strategy-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { classifyStrategy } from '@/features/game/strategy';
import { translate } from '@/lib/i18n';
import { FONT_SCALE_CAP } from '@/lib/ui/font-scale';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
  /** Whose plan this chip describes. */
  player: Player;
  /** Narrow rails: just the plan's mark; the name stays in the label and the sheet. */
  iconOnly?: boolean;
};

/** Resolve `game.strategy.<group>.<strategyKey>` without losing key typing. */
function strategyMessage(group: 'label' | 'tip', key: StrategyKey) {
  return translate(`game.strategy.${group}.${key}` as TxKeyPath);
}

/**
 * The plan the position points to, as a quiet chip (tap for why + a one-line
 * tip). Lives in the player strip of the side it describes.
 */
export function StrategyChip({ state, player, iconOnly = false }: Props) {
  const [showExplanation, setShowExplanation] = useState(false);
  const { height } = useWindowDimensions();
  const landscape = height < 500;
  const strategy = classifyStrategy(state, player);
  const label = strategyMessage('label', strategy.key);
  const tip = strategyMessage('tip', strategy.key);
  // The reasons and tips talk to "you": on the computer's side, just name its plan.
  const computer = state.mode === 'vs-computer' && player === 'black';
  const why = computer
    ? translate('game.strategy.computer_plan')
    : translate(`game.strategy.why.${strategy.reason.message}` as TxKeyPath, strategy.reason.params);

  return (
    <>
      <Pressable
        onPress={() => setShowExplanation(true)}
        accessibilityRole="button"
        accessibilityLabel={computer ? `${why}: ${label}` : `${label}. ${why} ${tip}`}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        hitSlop={8}
        testID={`strategy-line-${player}`}
      >
        <View testID={`strategy-mark-${player}`}>
          <StrategyMark strategy={strategy.key} size={14} />
        </View>
        {iconOnly
          ? null
          : (
              <Text maxFontSizeMultiplier={FONT_SCALE_CAP.control} style={styles.chipText}>{label}</Text>
            )}
      </Pressable>
      <Modal
        visible={showExplanation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplanation(false)}
      >
        <Pressable
          style={[styles.modalScrim, landscape && styles.modalScrimLandscape]}
          onPress={() => setShowExplanation(false)}
          testID="strategy-explanation-scrim"
        >
          <Pressable style={styles.modalCard} onPress={() => {}} testID="strategy-explanation">
            <View style={styles.modalHeader}>
              <StrategyMark strategy={strategy.key} size={22} />
              <Text maxFontSizeMultiplier={FONT_SCALE_CAP.body} style={styles.modalTitle}>{label}</Text>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text maxFontSizeMultiplier={FONT_SCALE_CAP.body} style={styles.whyText}>{why}</Text>
              {computer
                ? null
                : (
                    <Text maxFontSizeMultiplier={FONT_SCALE_CAP.body} style={styles.tipText}>{tip}</Text>
                  )}
            </ScrollView>
            <Pressable
              onPress={() => setShowExplanation(false)}
              accessibilityRole="button"
              accessibilityLabel={translate('game.strategy.close_a11y')}
              style={styles.modalClose}
              testID="strategy-explanation-close"
            >
              <Text maxFontSizeMultiplier={FONT_SCALE_CAP.control} style={styles.modalCloseText}>{translate('game.strategy.got_it')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 196, 153, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 153, 0.12)',
    ...continuousRadius(999),
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    letterSpacing: 0.2,
    ...interFont('medium'),
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // Short landscape screens: less chrome so the last tip line and Got it stay visible.
  modalScrimLandscape: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    padding: 20,
    maxWidth: 340,
    maxHeight: '100%',
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
    flexShrink: 1,
    color: GAME_PALETTE.text,
    fontSize: 17,
    ...interFont('semibold'),
  },
  modalBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalBodyContent: {
    gap: 10,
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
