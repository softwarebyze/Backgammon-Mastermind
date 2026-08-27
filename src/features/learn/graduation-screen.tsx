import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { QuizCard } from '@/features/learn/quiz-card';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { enableBeginnerGameAids } from '@/lib/game-preferences/beginner-aids';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { GRADUATION_QUIZ } from '@/lib/learn/curriculum';
import { allLessonsComplete, isReadyToPlay } from '@/lib/learn/progress';
import { interFont } from '@/lib/ui/fonts';
import { GAME_CHROME_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { continuousRadius } from '@/lib/ui/native-styles';

function LessonsIncompleteGate() {
  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />
      <Text style={styles.title}>{translate('learn.title')}</Text>
      <Pressable
        style={styles.primaryBtn}
        onPress={() => router.replace('/learn')}
      >
        <Text style={styles.primaryLabel}>{translate('learn.back_to_hub')}</Text>
      </Pressable>
    </View>
  );
}

export function GraduationScreen() {
  const { progress, completeQuiz } = useLearnProgress();
  const { startGame } = useGame();
  const posthog = usePostHog();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [softMessage, setSoftMessage] = useState<string | null>(null);

  const question = GRADUATION_QUIZ[questionIndex];
  const canPlay = isReadyToPlay(progress);

  useEffect(() => {
    posthog.capture('learn_graduation_opened', { source: 'screen' });
  }, [posthog]);

  const playFirstGame = useCallback(() => {
    hapticSelection();
    posthog.capture('learn_play_first_game', { source: 'graduation' });
    enableBeginnerGameAids();
    startGame('vs-computer');
    router.replace('/game');
  }, [posthog, startGame]);

  const onSelectOption = useCallback((optionId: string) => {
    if (!question || progress.quizPassed) {
      return;
    }
    const option = question.options.find(item => item.id === optionId);
    if (!option) {
      return;
    }
    posthog.capture('learn_quiz_answered', {
      question_id: question.id,
      option_id: optionId,
      correct: option.correct,
      question_index: questionIndex,
    });
    if (!option.correct) {
      hapticLight();
      setSoftMessage(translate('learn.graduation.quiz_wrong'));
      return;
    }
    hapticSelection();
    setSoftMessage(null);
    if (questionIndex >= GRADUATION_QUIZ.length - 1) {
      completeQuiz();
      posthog.capture('learn_quiz_completed');
      setSoftMessage(translate('learn.graduation.quiz_done'));
      return;
    }
    setQuestionIndex(index => index + 1);
  }, [completeQuiz, posthog, progress.quizPassed, question, questionIndex]);

  if (!allLessonsComplete(progress)) {
    return <LessonsIncompleteGate />;
  }

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <Text style={styles.body}>{translate('learn.graduation.body')}</Text>

        <View style={styles.recap}>
          {(['recap_1', 'recap_2', 'recap_3', 'recap_4', 'recap_5'] as const).map(key => (
            <Text key={key} style={styles.recapItem}>
              •
              {' '}
              {translate(`learn.graduation.${key}`)}
            </Text>
          ))}
        </View>

        {!progress.quizPassed && question
          ? (
              <QuizCard
                question={question}
                questionIndex={questionIndex}
                total={GRADUATION_QUIZ.length}
                softMessage={softMessage}
                onSelectOption={onSelectOption}
              />
            )
          : (
              <Text style={styles.doneMsg}>{translate('learn.graduation.quiz_done')}</Text>
            )}

        {(canPlay || progress.quizPassed) && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={playFirstGame}
          >
            <Text style={styles.primaryLabel}>
              {translate('learn.graduation.play_cta')}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
  },
  content: {
    width: '100%',
    maxWidth: GAME_CHROME_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    width: '100%',
    maxWidth: GAME_CHROME_MAX_WIDTH,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 22,
    ...interFont('bold'),
  },
  body: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    ...interFont('regular'),
  },
  recap: {
    gap: 6,
    padding: 14,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(14),
  },
  recapItem: {
    color: GAME_PALETTE.accentDim,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('regular'),
  },
  doneMsg: {
    color: '#A0D080',
    fontSize: 16,
    ...interFont('bold'),
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: GAME_PALETTE.accent,
    paddingVertical: 16,
    alignItems: 'center',
    ...continuousRadius(14),
  },
  primaryLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 17,
    ...interFont('bold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
