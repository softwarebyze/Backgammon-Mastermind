import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';
import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
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

/**
 * VoiceOver ignores accessibilityLiveRegion (Android) and aria-live (web), so
 * iOS announces new coach feedback explicitly.
 */
function useAnnounceOnIOS(message: string | null) {
  useEffect(() => {
    if (Platform.OS !== 'ios' || !message) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}

export function CoachCaption({
  titleKey,
  bodyKey,
  feedback,
  stepIndex,
  totalSteps,
  compact = false,
  completion = null,
}: Props) {
  const tone = feedback ? FEEDBACK_STYLES[feedback.tone] : null;
  const feedbackBody = feedback
    ? noBreakHyphens(translate(feedback.messageKey, feedback.messageOptions))
    : null;
  const card = completion
    ? {
        testID: 'learn-lesson-complete',
        style: FEEDBACK_STYLES.praise,
        icon: 'award' as const,
        title: completion.title,
        body: feedback?.tone === 'praise' ? feedbackBody : null,
        footnote: noBreakHyphens(completion.body),
      }
    : feedback && tone
      ? {
          testID: 'learn-feedback',
          style: tone,
          icon: tone.icon,
          title: translate(tone.titleKey),
          body: feedbackBody,
          footnote: null,
        }
      : null;
  useAnnounceOnIOS(card ? [card.title, card.body, card.footnote].filter(Boolean).join(' ') : null);

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

      <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
        {translate(titleKey as TxKeyPath)}
      </Text>
      <Text style={[styles.body, compact && styles.bodyCompact]}>
        {noBreakHyphens(translate(bodyKey as TxKeyPath))}
      </Text>

      {card
        ? (
            <View
              testID={card.testID}
              accessibilityLiveRegion="polite"
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
  title: {
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
