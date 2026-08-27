import type { TxKeyPath } from '@/lib/i18n';
import type { LessonId } from '@/lib/learn/curriculum';
import { router, useNavigation } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { CoachCaption } from '@/features/learn/coach-caption';
import { learnPrimaryCtaKey, learnPrimaryCtaKind } from '@/features/learn/learn-primary-cta';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { useLessonSession } from '@/features/learn/use-lesson-session';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { getLesson, getNextLessonId } from '@/lib/learn/curriculum';
import { isLastStepComplete } from '@/lib/learn/progress';
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
  const posthog = usePostHog();
  const showPointNumbers = session.aids?.showPointNumbers ?? false;
  const dimensions = useBoardDimensions({
    showPointNumbers,
    extraChrome: 80,
  });
  const completedEventRef = useRef(false);

  const { setBoardDimensions } = session;
  useEffect(() => {
    setBoardDimensions(dimensions);
  }, [dimensions, setBoardDimensions]);

  useEffect(() => {
    if (!isLastStepComplete(session.stepComplete, session.stepIndex, session.totalSteps)) {
      return;
    }
    completeLesson(lessonId);
    if (completedEventRef.current) {
      return;
    }
    completedEventRef.current = true;
    posthog.capture('learn_lesson_completed', { lesson_id: lessonId });
  }, [
    completeLesson,
    lessonId,
    posthog,
    session.stepComplete,
    session.stepIndex,
    session.totalSteps,
  ]);

  const goNext = useCallback(() => {
    if (session.step.kind === 'explain' && session.stepComplete) {
      posthog.capture('learn_step_completed', {
        lesson_id: lessonId,
        step_id: session.step.id,
        step_kind: session.step.kind,
        step_index: session.stepIndex,
      });
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
  }, [completeLesson, lessonId, posthog, session]);

  const awaitingBoardAction
    = !session.stepComplete
      && !session.lessonFinished
      && session.step.kind !== 'explain';

  const onPrimary = useCallback(() => {
    if (session.lessonFinished) {
      return;
    }
    if (awaitingBoardAction) {
      session.showHint();
      return;
    }
    goNext();
  }, [awaitingBoardAction, goNext, session]);

  const nextLessonId = getNextLessonId(lessonId);
  const ctaKind = learnPrimaryCtaKind({
    awaitingBoardAction,
    stepComplete: session.stepComplete,
    stepIndex: session.stepIndex,
    totalSteps: session.totalSteps,
    nextLessonId,
  });
  const primaryLabel = translate(learnPrimaryCtaKey(ctaKind));
  const showDice = session.state.dice[0] !== 0 || session.state.dice[1] !== 0;
  const showCompleteBanner
    = session.stepComplete && session.stepIndex >= session.totalSteps - 1;

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

        <View style={styles.boardWrap} pointerEvents="box-none">
          <View
            style={[styles.boardContainer, { maxWidth: dimensions.boardOuterWidth }]}
            pointerEvents="box-none"
          >
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
        </View>

        <View style={styles.footer} testID="learn-lesson-footer">
          <View style={styles.diceRow}>
            {showDice
              ? (
                  <DiceDisplay
                    dice={session.state.dice}
                    remainingDice={session.state.remainingDice}
                    playerColor="white"
                    displayStyle={diceDisplayStyle}
                    animateRoll={false}
                  />
                )
              : null}
          </View>

          <View style={styles.completeSlot}>
            {showCompleteBanner
              ? (
                  <Text style={styles.completeBanner}>{translate('learn.lesson_complete')}</Text>
                )
              : null}
          </View>

          <Pressable
            key="learn-primary-cta"
            testID="learn-primary-cta"
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            style={({ pressed }) => [
              ctaKind === 'hint' ? styles.hintBtn : styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={onPrimary}
          >
            <Text style={ctaKind === 'hint' ? styles.hintLabel : styles.primaryLabel}>
              {primaryLabel}
            </Text>
          </Pressable>
        </View>
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
  boardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingBottom: 4,
  },
  diceRow: {
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 8,
  },
  completeSlot: {
    minHeight: 28,
    justifyContent: 'center',
    marginBottom: 4,
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
  hintBtn: {
    marginTop: 4,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.35)',
    paddingVertical: 14,
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
  hintLabel: {
    color: 'rgba(232, 224, 208, 0.75)',
    fontSize: 16,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
