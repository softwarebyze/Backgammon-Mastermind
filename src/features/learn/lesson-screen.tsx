import type { TxKeyPath } from '@/lib/i18n';
import type { LessonId } from '@/lib/learn/curriculum';
import Feather from '@expo/vector-icons/Feather';
import { router, useNavigation } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import {
  MIN_LEARN_BOARD_SLOT_HEIGHT,
  useBoardDimensions,
} from '@/features/game/hooks/use-board-dimensions';
import { usePublishBoardSlot } from '@/features/game/hooks/use-publish-board-slot';
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
import { LANDSCAPE_GAP } from '@/lib/ui/game-chrome';
import { useLayoutMetrics } from '@/lib/ui/layout-metrics';
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
  const { insets, landscape, chromeWidth, boardPaneWidth, boardMaxWidth, stageMaxWidth } = useLayoutMetrics();
  const showPointNumbers = session.aids?.showPointNumbers ?? false;
  const { onTopLayout, onControlsLayout, onSlotLayout, captionMaxHeight } = usePublishBoardSlot({
    reviewHeight: 0,
    minBoardHeight: landscape ? 0 : MIN_LEARN_BOARD_SLOT_HEIGHT,
  });
  const dimensions = useBoardDimensions({ showPointNumbers });
  const completedEventRef = useRef(false);
  const captionScrollRef = useRef<ScrollView>(null);

  const { setBoardDimensions } = session;
  useEffect(() => {
    setBoardDimensions(dimensions);
  }, [dimensions, setBoardDimensions]);

  // Praise can land below the fold on short screens; keep it visible long
  // enough to read instead of letting it slide out of the caption viewport.
  useEffect(() => {
    if (!session.feedback) {
      return;
    }
    const handle = setTimeout(() => {
      captionScrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(handle);
  }, [session.feedback]);

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

  const caption = (
    <CoachCaption
      titleKey={session.step.titleKey}
      bodyKey={session.step.bodyKey}
      feedback={session.feedback}
      stepIndex={session.stepIndex}
      totalSteps={session.totalSteps}
      compact={landscape || (captionMaxHeight != null && captionMaxHeight < 160)}
    />
  );

  const footer = (
    <View style={styles.footer} testID="learn-lesson-footer" onLayout={onControlsLayout}>
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

      {showCompleteBanner
        ? (
            <View testID="learn-lesson-complete" style={styles.completeCard}>
              <View style={styles.completeIcon}>
                <Feather name="award" size={20} color="#4ADE80" />
              </View>
              <View style={styles.completeText}>
                <Text style={styles.completeTitle}>
                  {translate('learn.lesson_complete')}
                </Text>
                <Text style={styles.completeBody}>
                  {translate('learn.lesson_complete_body', {
                    title: translate(lesson.titleKey as TxKeyPath),
                  })}
                </Text>
              </View>
            </View>
          )
        : null}

      <View style={styles.footerActions}>
        <Pressable
          key="learn-back"
          testID="learn-back"
          accessibilityRole="button"
          accessibilityLabel={translate('learn.back')}
          accessibilityState={{ disabled: !session.canGoBack }}
          disabled={!session.canGoBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            !session.canGoBack && styles.backBtnDisabled,
            pressed && styles.pressed,
          ]}
          onPress={session.back}
        >
          <Feather name="chevron-left" size={18} color={GAME_PALETTE.accentDim} />
          <Text style={styles.backLabel}>{translate('learn.back')}</Text>
        </Pressable>

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
          <Feather
            name={ctaKind === 'hint' ? 'info' : 'arrow-right'}
            size={18}
            color={ctaKind === 'hint' ? GAME_PALETTE.accentDim : GAME_PALETTE.bg}
          />
          <Text style={ctaKind === 'hint' ? styles.hintLabel : styles.primaryLabel}>
            {primaryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const portraitCaption = (
    <View
      style={[
        styles.captionHost,
        captionMaxHeight != null ? { maxHeight: captionMaxHeight } : null,
      ]}
      testID="learn-caption-host"
      onLayout={onTopLayout}
    >
      <ScrollView
        ref={captionScrollRef}
        style={captionMaxHeight != null ? { maxHeight: captionMaxHeight } : undefined}
        contentContainerStyle={styles.captionScrollContent}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        testID="learn-caption-scroll"
      >
        {caption}
      </ScrollView>
    </View>
  );

  return (
    <>
      <FocusAwareStatusBar />
      <View
        style={[
          styles.root,
          landscape ? styles.rootLandscape : null,
          {
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: Math.max(8, insets.bottom),
          },
          landscape && stageMaxWidth != null
            ? { maxWidth: stageMaxWidth, width: '100%', alignSelf: 'center' }
            : null,
        ]}
      >
        {landscape ? null : portraitCaption}

        <View
          style={[
            styles.boardWrap,
            landscape ? styles.boardWrapLandscape : styles.boardWrapPortrait,
            { maxWidth: boardPaneWidth ?? boardMaxWidth },
          ]}
          pointerEvents="box-none"
          testID="learn-board-slot"
          onLayout={onSlotLayout}
        >
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

        {landscape
          ? (
              <View style={[styles.sidePanel, { width: chromeWidth }]}>
                <ScrollView
                  ref={captionScrollRef}
                  style={styles.captionScroll}
                  contentContainerStyle={styles.captionScrollContent}
                  bounces={false}
                  overScrollMode="never"
                >
                  {caption}
                </ScrollView>
                {footer}
              </View>
            )
          : footer}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
  },
  rootLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: LANDSCAPE_GAP,
  },
  sidePanel: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    alignItems: 'center',
  },
  captionHost: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  captionScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    width: '100%',
  },
  captionScrollContent: {
    flexGrow: 0,
  },
  boardWrap: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardWrapPortrait: {
    width: '100%',
    minHeight: MIN_LEARN_BOARD_SLOT_HEIGHT,
  },
  boardWrapLandscape: {
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 0,
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
    justifyContent: 'center',
    marginBottom: 8,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minWidth: 96,
  },
  backBtnDisabled: {
    opacity: 0.3,
  },
  backLabel: {
    color: GAME_PALETTE.accentDim,
    fontSize: 15,
    ...interFont('semibold'),
  },
  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 420,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    ...continuousRadius(14),
  },
  completeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
  },
  completeText: {
    flex: 1,
    gap: 2,
  },
  completeTitle: {
    color: '#4ADE80',
    fontSize: 15,
    ...interFont('bold'),
  },
  completeBody: {
    color: GAME_PALETTE.text,
    fontSize: 12,
    lineHeight: 17,
    ...interFont('regular'),
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: GAME_PALETTE.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 180,
    alignItems: 'center',
    ...continuousRadius(14),
  },
  hintBtn: {
    marginTop: 4,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.35)',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 180,
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
