import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import type { TxKeyPath } from '@/lib/i18n';

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/scaled-text';
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
};

/** Below this window height the caption shares a phone-sized screen with the board. */
const SHORT_SCREEN_HEIGHT = 700;

export function CoachCaption({ titleKey, bodyKey, feedback, stepLabel, compact = false }: Props) {
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
      <Text accessibilityRole="header" maxFontSizeMultiplier={FONT_SCALE_CAP.control} style={[styles.title, compact && styles.titleCompact]}>
        {translate(titleKey as TxKeyPath)}
      </Text>
      <Text maxFontSizeMultiplier={bodyCap} style={[styles.body, compact && styles.bodyCompact]}>{translate(bodyKey as TxKeyPath)}</Text>
      {feedback
        ? (
            <Text maxFontSizeMultiplier={bodyCap} style={[styles.feedback, { color: feedbackColor }]}>
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
  title: {
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
