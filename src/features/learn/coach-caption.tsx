import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
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
};

const FEEDBACK_STYLES = {
  praise: {
    color: '#4ADE80',
    surface: 'rgba(74, 222, 128, 0.12)',
    icon: 'check-circle' as const,
    titleKey: 'learn.feedback.correct_title' as TxKeyPath,
  },
  hint: {
    color: GAME_PALETTE.accent,
    surface: 'rgba(255, 137, 51, 0.12)',
    icon: 'info' as const,
    titleKey: 'learn.hint' as TxKeyPath,
  },
  soft: {
    color: GAME_PALETTE.accentDim,
    surface: 'rgba(255, 196, 153, 0.10)',
    icon: 'alert-circle' as const,
    titleKey: 'learn.feedback.try_again_title' as TxKeyPath,
  },
} as const;

export function CoachCaption({
  titleKey,
  bodyKey,
  feedback,
  stepIndex,
  totalSteps,
  compact = false,
}: Props) {
  const tone = feedback ? FEEDBACK_STYLES[feedback.tone] : null;

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
        {translate(bodyKey as TxKeyPath)}
      </Text>

      {feedback && tone
        ? (
            <View
              testID="learn-feedback"
              accessibilityLiveRegion="polite"
              style={[styles.feedback, { backgroundColor: tone.surface, borderColor: tone.color }]}
            >
              <Feather name={tone.icon} size={18} color={tone.color} style={styles.feedbackIcon} />
              <View style={styles.feedbackText}>
                <Text style={[styles.feedbackTitle, { color: tone.color }]}>
                  {translate(tone.titleKey)}
                </Text>
                <Text style={styles.feedbackBody}>
                  {translate(feedback.messageKey, feedback.messageOptions)}
                </Text>
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
    borderLeftWidth: 3,
    overflow: 'hidden',
    ...continuousRadius(10),
  },
  feedbackIcon: {
    marginTop: 1,
  },
  feedbackText: {
    flex: 1,
    gap: 2,
  },
  feedbackTitle: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    ...interFont('bold'),
  },
  feedbackBody: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('medium'),
  },
});
