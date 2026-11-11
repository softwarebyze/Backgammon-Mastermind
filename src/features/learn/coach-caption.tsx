import type { StrategyKey } from '@/features/game/strategy';
import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';

import { Platform, StyleSheet, Text, View } from 'react-native';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
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
  /** Where this step is in the lesson, drawn as a row of pips in place of the label. */
  stepIndex?: number;
  totalSteps?: number;
  compact?: boolean;
  /** A game-plan step shows the same icon as the plan chip in a game. */
  strategy?: StrategyKey;
  /** A cube step shows the cube as a game draws it. */
  cube?: { value: number; unavailable?: boolean };
};

/** Ivory and its muted tone, from the board's checkers: amber stays on the button to press. */
const IVORY = '#ECE4D4';
const MUTED = '#B8A48F';

/** A fresh key per feedback, so the same message twice is a new node to announce. */
const feedbackKeys = new WeakMap<LessonFeedback, number>();
let nextFeedbackKey = 0;
function feedbackKey(feedback: LessonFeedback): number {
  let key = feedbackKeys.get(feedback);
  if (key === undefined) {
    nextFeedbackKey += 1;
    key = nextFeedbackKey;
    feedbackKeys.set(feedback, key);
  }
  return key;
}

export function CoachCaption({ titleKey, bodyKey, feedback, stepLabel, stepIndex = 0, totalSteps = 0, compact = false, strategy, cube }: Props) {
  const feedbackColor
    = feedback?.tone === 'praise'
      ? '#A0D080'
      : feedback?.tone === 'soft'
        ? GAME_PALETTE.accent
        : GAME_PALETTE.accentDim;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      {/* The pips are the progress; a screen reader hears "Step 2 of 4" instead. */}
      {totalSteps > 1
        ? (
            <View
              testID="learn-step-pips"
              style={styles.pips}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={stepLabel}
              accessibilityValue={{ min: 0, max: totalSteps, now: stepIndex + 1 }}
            >
              {Array.from({ length: totalSteps }, (_, index) => (
                <View
                  key={index}
                  testID={index < stepIndex ? 'learn-step-pip-done' : index === stepIndex ? 'learn-step-pip-current' : 'learn-step-pip-ahead'}
                  style={[styles.pip, index < stepIndex && styles.pipDone, index === stepIndex && styles.pipCurrent]}
                />
              ))}
            </View>
          )
        // A one-step lesson has no progress to show; without a count, fall back to the label.
        : totalSteps === 1 ? null : <Text style={styles.stepLabel}>{stepLabel}</Text>}
      <View style={styles.titleRow}>
        {strategy
          ? (
              // The title already names the plan; the icon is for the eye.
              <View testID={`learn-strategy-${strategy}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <StrategyMark strategy={strategy} size={compact ? 18 : 22} />
              </View>
            )
          : null}
        {cube
          ? (
              <View testID="learn-cube" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.cube}>
                <DoublingCubeFace value={cube.value} unavailable={cube.unavailable} size={compact ? 22 : 28} />
              </View>
            )
          : null}
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
          {translate(titleKey as TxKeyPath)}
        </Text>
      </View>
      <Text style={[styles.body, compact && styles.bodyCompact]}>{translate(bodyKey as TxKeyPath)}</Text>
      {/* react-native-web's announceForAccessibility does nothing, so on web
          the feedback sits in a live region; native already announces it. */}
      <View testID="learn-feedback-live" accessibilityLiveRegion={Platform.OS === 'web' ? 'polite' : undefined}>
        {feedback
          ? (
              <Text
                key={feedbackKey(feedback)}
                testID="learn-feedback"
                style={[styles.feedback, { color: feedbackColor }]}
              >
                {translate(feedback.messageKey, feedback.messageOptions)}
              </Text>
            )
          : null}
      </View>
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
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    ...interFont('medium'),
  },
  pips: {
    width: '100%',
    maxWidth: 160,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pip: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(236, 228, 212, 0.14)',
  },
  pipDone: {
    backgroundColor: IVORY,
  },
  pipCurrent: {
    backgroundColor: GAME_PALETTE.accent,
  },
  cube: {
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    color: IVORY,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    ...interFont('bold'),
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 21,
  },
  body: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 21,
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
