import type { StrategyKey } from '@/features/game/strategy';
import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';

import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/scaled-text';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { StrategyMark } from '@/features/game/components/strategy-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { FONT_SCALE_CAP } from '@/lib/ui/font-scale';
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
  /** A cube step shows the cube as a game draws it. */
  cube?: { value: number; unavailable?: boolean };
};

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

/** Below this window height the caption shares a phone-sized screen with the board. */
const SHORT_SCREEN_HEIGHT = 700;

export function CoachCaption({ titleKey, bodyKey, feedback, stepLabel, compact = false, strategy, cube }: Props) {
  // On short screens 2× copy squeezes the board and scrolls mid-sentence, so
  // the step text grows only as far as the title.
  const { height } = useWindowDimensions();
  const bodyCap = height < SHORT_SCREEN_HEIGHT ? FONT_SCALE_CAP.control : FONT_SCALE_CAP.body;
  const feedbackColor
    = feedback?.tone === 'praise'
      ? '#A0D080'
      : feedback?.tone === 'soft'
        ? GAME_PALETTE.accent
        : GAME_PALETTE.accentDim;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <Text maxFontSizeMultiplier={FONT_SCALE_CAP.control} style={styles.stepLabel}>{stepLabel}</Text>
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
        <Text accessibilityRole="header" maxFontSizeMultiplier={FONT_SCALE_CAP.control} style={[styles.title, compact && styles.titleCompact]}>
          {translate(titleKey as TxKeyPath)}
        </Text>
      </View>
      <Text maxFontSizeMultiplier={bodyCap} style={[styles.body, compact && styles.bodyCompact]}>{translate(bodyKey as TxKeyPath)}</Text>
      {/* react-native-web's announceForAccessibility does nothing, so on web
          the feedback sits in a live region; native already announces it. */}
      <View testID="learn-feedback-live" accessibilityLiveRegion={Platform.OS === 'web' ? 'polite' : undefined}>
        {feedback
          ? (
              <Text
                key={feedbackKey(feedback)}
                testID="learn-feedback"
                maxFontSizeMultiplier={bodyCap}
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
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1,
    ...interFont('medium'),
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
