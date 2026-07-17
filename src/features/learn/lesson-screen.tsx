import type { TxKeyPath } from '@/lib/i18n';
import type { LessonId } from '@/lib/learn/curriculum';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { CoachCaption } from '@/features/learn/coach-caption';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { useLessonSession } from '@/features/learn/use-lesson-session';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { getLesson, getNextLessonId } from '@/lib/learn/curriculum';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  lessonId: LessonId;
};

export function LessonScreen({ lessonId }: Props) {
  const lesson = getLesson(lessonId);
  const navigation = useNavigation();
  const { completeLesson, startLearning } = useLearnProgress();
  const { preferences } = useGamePreferences();

  useEffect(() => {
    startLearning();
  }, [startLearning]);

  useLayoutEffect(() => {
    if (!lesson) {
      return;
    }
    navigation.setOptions({
      title: translate(lesson.titleKey as TxKeyPath),
    });
  }, [lesson, navigation]);

  if (!lesson) {
    return (
      <View style={styles.root}>
        <FocusAwareStatusBar />
      </View>
    );
  }

  return (
    <LessonScreenBody
      key={lessonId}
      lesson={lesson}
      lessonId={lessonId}
      completeLesson={completeLesson}
      diceDisplayStyle={preferences.diceDisplayStyle}
    />
  );
}

/* eslint-disable max-lines-per-function -- lesson board + coach composition */
function LessonScreenBody({
  lesson,
  lessonId,
  completeLesson,
  diceDisplayStyle,
}: {
  lesson: NonNullable<ReturnType<typeof getLesson>>;
  lessonId: LessonId;
  completeLesson: (id: LessonId) => void;
  diceDisplayStyle: 'numbers' | 'dots';
}) {
  const session = useLessonSession(lesson);
  const showPointNumbers = session.aids?.showPointNumbers ?? false;
  const dimensions = useBoardDimensions({
    showPointNumbers,
    extraChrome: 80,
  });

  const { setBoardDimensions } = session;
  useEffect(() => {
    setBoardDimensions(dimensions);
  }, [dimensions, setBoardDimensions]);

  const onPrimary = useCallback(() => {
    if (session.lessonFinished) {
      return;
    }
    if (!session.stepComplete) {
      session.showHint();
      return;
    }
    if (session.stepIndex >= session.totalSteps - 1) {
      hapticLight();
      completeLesson(lessonId);
      const next = getNextLessonId(lessonId);
      if (next === 'graduation') {
        router.replace('/learn/graduation');
        return;
      }
      if (next) {
        router.replace(`/learn/${next}`);
        return;
      }
      router.replace('/learn');
      return;
    }
    session.advance();
  }, [completeLesson, lessonId, session]);

  const primaryLabel = !session.stepComplete
    ? translate('learn.continue')
    : session.stepIndex >= session.totalSteps - 1
      ? translate('learn.next_lesson')
      : translate('learn.continue');

  const showDice = session.state.dice[0] !== 0 || session.state.dice[1] !== 0;

  return (
    <>
      <FocusAwareStatusBar />
      <View style={styles.root}>
        <CoachCaption
          titleKey={session.step.titleKey}
          bodyKey={session.step.bodyKey}
          feedback={session.feedback}
          stepLabel={translate('learn.step_progress', {
            current: session.stepIndex + 1,
            total: session.totalSteps,
          })}
        />

        <View style={styles.boardWrap}>
          <BoardView
            state={session.state}
            dimensions={dimensions}
            previewTarget={session.previewTarget}
            moveAnimation={null}
            dragFrom={session.canDrag ? session.dragFrom : null}
            onPointPress={session.onPointPress}
            onPointPressIn={session.onPointPressIn}
            onPointPressOut={session.onPointPressOut}
            onDragAttempt={session.canDrag ? session.handleDragAttempt : undefined}
            onDragStart={session.canDrag ? session.handleDragStart : undefined}
            onDragMove={session.canDrag ? session.handleDragMove : undefined}
            onDragEnd={session.canDrag ? session.handleDragEnd : undefined}
            onDragCancel={session.canDrag ? session.handleDragCancel : undefined}
            onBarPress={session.onBarPress}
            onBearOffPress={session.onBearOffPress}
            interactionEnabled={!session.lessonFinished}
            aidsOverride={session.aids}
            emphasisPoints={session.emphasisPoints}
            emphasisBar={session.emphasisBar}
          />
        </View>

        {showDice
          ? (
              <View style={styles.diceRow}>
                <DiceDisplay
                  dice={session.state.dice}
                  remainingDice={session.state.remainingDice}
                  playerColor="white"
                  displayStyle={diceDisplayStyle}
                  animateRoll={false}
                />
              </View>
            )
          : null}

        {session.stepComplete && session.stepIndex >= session.totalSteps - 1
          ? (
              <Text style={styles.completeBanner}>{translate('learn.lesson_complete')}</Text>
            )
          : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={onPrimary}
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
    paddingBottom: 24,
  },
  boardWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceRow: {
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 8,
  },
  completeBanner: {
    color: '#A0D080',
    fontSize: 15,
    marginBottom: 8,
    ...interFont('bold'),
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: GAME_PALETTE.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 220,
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
