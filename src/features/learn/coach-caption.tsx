import type { StrategyKey } from '@/features/game/strategy';
import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';

import { StyleSheet, Text, View } from 'react-native';
import { StrategyMark } from '@/features/game/components/strategy-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  titleKey: string;
  bodyKey: string;
  feedback: LessonFeedback | null;
  stepLabel: string;
  compact?: boolean;
  /** A game-plan step shows the same icon as the plan chip in a game. */
  strategy?: StrategyKey;
};

export function CoachCaption({ titleKey, bodyKey, feedback, stepLabel, compact = false, strategy }: Props) {
  const feedbackColor
    = feedback?.tone === 'praise'
      ? '#A0D080'
      : feedback?.tone === 'soft'
        ? GAME_PALETTE.accent
        : GAME_PALETTE.accentDim;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <Text style={styles.stepLabel}>{stepLabel}</Text>
      <View style={styles.titleRow}>
        {strategy
          ? (
              // The title already names the plan; the icon is for the eye.
              <View testID={`learn-strategy-${strategy}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <StrategyMark strategy={strategy} size={compact ? 18 : 22} />
              </View>
            )
          : null}
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
          {translate(titleKey as TxKeyPath)}
        </Text>
      </View>
      <Text style={[styles.body, compact && styles.bodyCompact]}>{translate(bodyKey as TxKeyPath)}</Text>
      {feedback
        ? (
            <Text
              testID="learn-feedback"
              style={[styles.feedback, { color: feedbackColor }]}
            >
              {translate(feedback.messageKey, feedback.messageOptions)}
            </Text>
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
    flexShrink: 1,
  },
  rootCompact: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 0,
    maxWidth: '100%',
  },
  stepLabel: {
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1,
    ...interFont('medium'),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    color: GAME_PALETTE.accent,
    fontSize: 18,
    ...interFont('bold'),
  },
  titleCompact: {
    fontSize: 16,
  },
  body: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    ...interFont('regular'),
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedback: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('medium'),
    backgroundColor: GAME_PALETTE.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
    ...continuousRadius(10),
  },
});
