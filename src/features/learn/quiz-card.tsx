import type { TxKeyPath } from '@/lib/i18n';
import type { QuizQuestion } from '@/lib/learn/curriculum';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  question: QuizQuestion;
  questionIndex: number;
  total: number;
  softMessage: string | null;
  onSelectOption: (optionId: string) => void;
};

export function QuizCard({
  question,
  questionIndex,
  total,
  softMessage,
  onSelectOption,
}: Props) {
  return (
    <View style={styles.quizCard}>
      <Text style={styles.quizTitle}>
        {translate('learn.graduation.quiz_title')}
        {' '}
        (
        {questionIndex + 1}
        /
        {total}
        )
      </Text>
      <Text style={styles.prompt}>
        {translate(question.promptKey as TxKeyPath)}
      </Text>
      <View style={styles.options}>
        {question.options.map(option => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            style={({ pressed }) => [styles.optionBtn, pressed && styles.pressed]}
            onPress={() => onSelectOption(option.id)}
          >
            <Text style={styles.optionLabel}>
              {translate(option.labelKey as TxKeyPath)}
            </Text>
          </Pressable>
        ))}
      </View>
      {softMessage ? <Text style={styles.soft}>{softMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quizCard: {
    gap: 12,
    padding: 16,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(14),
  },
  quizTitle: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    letterSpacing: 1,
    ...interFont('bold'),
  },
  prompt: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('semibold'),
  },
  options: {
    gap: 8,
  },
  optionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    ...continuousRadius(12),
  },
  optionLabel: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('medium'),
  },
  soft: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    ...interFont('medium'),
  },
  pressed: {
    opacity: 0.88,
  },
});
