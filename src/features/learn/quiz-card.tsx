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
  selectedOptionId?: string | null;
  onSelectOption: (optionId: string) => void;
};

export function QuizCard({
  question,
  questionIndex,
  total,
  softMessage,
  selectedOptionId,
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
        {question.options.map((option) => {
          const selected = option.id === selectedOptionId;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`quiz-option-${option.id}`}
              style={({ pressed }) => [
                styles.optionBtn,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
              onPress={() => onSelectOption(option.id)}
            >
              <Text style={[styles.optionLabel, selected && styles.optionSelectedLabel]}>
                {translate(option.labelKey as TxKeyPath)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {softMessage ? <Text style={styles.soft}>{softMessage}</Text> : null}
    </View>
  );
}

export const quizOptionSelectedStyle = {
  backgroundColor: GAME_PALETTE.accent,
  borderColor: GAME_PALETTE.accent,
} as const;

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
  optionSelected: {
    ...quizOptionSelectedStyle,
  },
  optionLabel: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('medium'),
  },
  optionSelectedLabel: {
    color: GAME_PALETTE.bg,
    ...interFont('bold'),
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
