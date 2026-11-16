import type { StrategyKey } from '@/features/game/strategy';
import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';
import Feather from '@expo/vector-icons/Feather';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { StrategyMark } from '@/features/game/components/strategy-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { noBreakHyphens } from '@/features/learn/no-break-hyphens';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  titleKey: string;
  bodyKey: string;
  feedback: LessonFeedback | null;
  stepIndex: number;
  totalSteps: number;
  compact?: boolean;
  /**
   * Final step done: one success card replaces the per-step "Correct!" card,
   * carrying the step's praise plus the next-lesson line.
   */
  completion?: { title: string; body: string } | null;
  /** A game-plan step shows the same icon as the plan chip in a game. */
  strategy?: StrategyKey;
  /** A cube step shows the cube as a game draws it. */
  cube?: { value: number; unavailable?: boolean };
};

const FEEDBACK_STYLES = {
  praise: {
    color: '#4ADE80',
    surface: 'rgba(74, 222, 128, 0.08)',
    border: 'rgba(74, 222, 128, 0.28)',
    icon: 'check-circle' as const,
    titleKey: 'learn.feedback.correct_title' as TxKeyPath,
  },
  hint: {
    color: GAME_PALETTE.accent,
    surface: 'rgba(255, 137, 51, 0.08)',
    border: 'rgba(255, 137, 51, 0.30)',
    icon: 'info' as const,
    titleKey: 'learn.hint' as TxKeyPath,
  },
  soft: {
    color: GAME_PALETTE.accentDim,
    surface: 'rgba(255, 196, 153, 0.07)',
    border: 'rgba(255, 196, 153, 0.26)',
    icon: 'alert-circle' as const,
    titleKey: 'learn.feedback.try_again_title' as TxKeyPath,
  },
} as const;

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

type FeedbackCard = {
  testID: string;
  style: (typeof FEEDBACK_STYLES)[keyof typeof FEEDBACK_STYLES];
  icon: 'award' | (typeof FEEDBACK_STYLES)[keyof typeof FEEDBACK_STYLES]['icon'];
  title: string;
  body: string | null;
  footnote: string | null;
  key: string | number;
};

function buildFeedbackCard(
  feedback: LessonFeedback | null,
  completion: { title: string; body: string } | null,
): FeedbackCard | null {
  const tone = feedback ? FEEDBACK_STYLES[feedback.tone] : null;
  const feedbackBody = feedback
    ? noBreakHyphens(translate(feedback.messageKey, feedback.messageOptions))
    : null;
  if (completion) {
    return {
      testID: 'learn-lesson-complete',
      style: FEEDBACK_STYLES.praise,
      icon: 'award',
      title: completion.title,
      body: feedback?.tone === 'praise' ? feedbackBody : null,
      footnote: noBreakHyphens(completion.body),
      key: 'complete',
    };
  }
  if (feedback && tone) {
    return {
      testID: 'learn-feedback',
      style: tone,
      icon: tone.icon,
      title: translate(tone.titleKey),
      body: feedbackBody,
      footnote: null,
      key: feedbackKey(feedback),
    };
  }
  return null;
}

export function CoachCaption({
  titleKey,
  bodyKey,
  feedback,
  stepIndex,
  totalSteps,
  compact = false,
  completion = null,
  strategy,
  cube,
}: Props) {
  const card = buildFeedbackCard(feedback, completion);

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={styles.progressRow}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
          {Array.from({ length: totalSteps }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index <= stepIndex && styles.dotReached,
                index === stepIndex && styles.dotCurrent,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          {translate('learn.step_progress', { current: stepIndex + 1, total: totalSteps })}
        </Text>
      </View>

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
      <Text style={[styles.body, compact && styles.bodyCompact]}>
        {noBreakHyphens(translate(bodyKey as TxKeyPath))}
      </Text>

      {/* react-native-web's announceForAccessibility does nothing, so on web
          the feedback sits in a live region; native already announces it. */}
      <View
        testID="learn-feedback-live"
        accessibilityLiveRegion={Platform.OS === 'web' ? 'polite' : undefined}
      >
        {card
          ? (
              <View
                key={card.key}
                testID={card.testID}
                style={[styles.feedback, { backgroundColor: card.style.surface, borderColor: card.style.border }]}
              >
                <Feather name={card.icon} size={18} color={card.style.color} style={styles.feedbackIcon} />
                <View style={styles.feedbackText}>
                  <Text style={[styles.feedbackTitle, { color: card.style.color }]}>
                    {card.title}
                  </Text>
                  {card.body
                    ? <Text style={styles.feedbackBody}>{card.body}</Text>
                    : null}
                  {card.footnote
                    ? <Text style={styles.feedbackFootnote}>{card.footnote}</Text>
                    : null}
                </View>
              </View>
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
    gap: 6,
    flexShrink: 1,
  },
  rootCompact: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 0,
    maxWidth: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
  },
  dotReached: {
    backgroundColor: GAME_PALETTE.accentDim,
    borderColor: GAME_PALETTE.accentDim,
  },
  dotCurrent: {
    backgroundColor: GAME_PALETTE.accent,
    borderColor: GAME_PALETTE.accent,
    width: 18,
  },
  stepLabel: {
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 0.5,
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
    fontSize: 20,
    lineHeight: 26,
    ...interFont('bold'),
  },
  titleCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
    ...interFont('regular'),
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 19,
  },
  feedback: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    ...continuousRadius(12),
  },
  feedbackIcon: {
    marginTop: 1,
  },
  feedbackText: {
    flex: 1,
    gap: 2,
  },
  feedbackTitle: {
    fontSize: 14,
    lineHeight: 19,
    ...interFont('bold'),
  },
  feedbackBody: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('medium'),
  },
  feedbackFootnote: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    lineHeight: 18,
    ...interFont('regular'),
  },
});
