import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';

import { StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  titleKey: string;
  bodyKey: string;
  feedback: LessonFeedback | null;
  stepLabel: string;
};

export function CoachCaption({ titleKey, bodyKey, feedback, stepLabel }: Props) {
  const feedbackColor
    = feedback?.tone === 'praise'
      ? '#A0D080'
      : feedback?.tone === 'soft'
        ? GAME_PALETTE.accent
        : GAME_PALETTE.accentDim;

  return (
    <View style={styles.root}>
      <Text style={styles.stepLabel}>{stepLabel}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {translate(titleKey as TxKeyPath)}
      </Text>
      <Text style={styles.body}>{translate(bodyKey as TxKeyPath)}</Text>
      {feedback
        ? (
            <Text style={[styles.feedback, { color: feedbackColor }]}>
              {translate(feedback.messageKey)}
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
    paddingVertical: 12,
    gap: 6,
  },
  stepLabel: {
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1,
    ...interFont('medium'),
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 20,
    ...interFont('bold'),
  },
  body: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    ...interFont('regular'),
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
