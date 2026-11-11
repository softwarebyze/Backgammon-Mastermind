import type { TxKeyPath } from '@/lib/i18n';
import type { LessonId } from '@/lib/learn/curriculum';
import type { LearnProgress } from '@/lib/learn/progress';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useGame } from '@/features/game/use-game';
import { LEARN_INK } from '@/features/learn/learn-ink';
import { LearnNextCard } from '@/features/learn/learn-next-card';
import { LessonRow } from '@/features/learn/lesson-row';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { enableBeginnerGameAids } from '@/lib/game-preferences/beginner-aids';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import {
  getLesson,
  LESSON_CHAPTERS,
  LESSON_IDS,
} from '@/lib/learn/curriculum';
import {
  completedLessonCount,
  isReadyToPlay,
  nextToStudy,
} from '@/lib/learn/progress';
import { interFont } from '@/lib/ui/fonts';
import { GAME_CHROME_MAX_WIDTH, PAGE_STAGE_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { continuousRadius } from '@/lib/ui/native-styles';

/** The course in chapters; the suggested lesson is lit, and any lesson opens. */
function Chapters({ progress, next, wide, onOpen }: {
  progress: LearnProgress;
  next: LessonId | 'graduation';
  /** Landscape and desktop: chapters side by side. */
  wide: boolean;
  onOpen: (id: LessonId, source: 'list') => void;
}) {
  return (
    <View style={[styles.chapters, wide && styles.chaptersWide]}>
      {LESSON_CHAPTERS.map(chapter => (
        <View key={chapter.id} testID={`learn-chapter-${chapter.id}`} style={[styles.chapter, wide && styles.chapterWide]}>
          <Text accessibilityRole="header" style={styles.chapterTitle}>{translate(chapter.titleKey as TxKeyPath)}</Text>
          <View style={styles.chapterList}>
            {chapter.lessonIds.map((id, index) => (
              <LessonRow
                key={id}
                lesson={getLesson(id)!}
                completed={progress.completedLessons.includes(id)}
                next={id === next}
                last={index === chapter.lessonIds.length - 1}
                onPress={() => onOpen(id, 'list')}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** The course hub: what to do next, then every lesson by chapter. */
export function LearnHubScreen() {
  const { progress, startLearning } = useLearnProgress();
  const { startGame, state } = useGame();
  const posthog = usePostHog();
  const { insets, landscape } = useLayoutMetrics();
  const done = completedLessonCount(progress);
  const total = LESSON_IDS.length;
  const ready = isReadyToPlay(progress);
  const next = nextToStudy(progress);
  const nextLesson = next === 'graduation' ? undefined : getLesson(next);

  useEffect(() => {
    posthog.capture('learn_hub_opened', {
      lessons_completed: done,
      quiz_passed: progress.quizPassed,
    });
  }, [done, posthog, progress.quizPassed]);

  const playFirstGame = useCallback((source: 'hub_cta' | 'hub_skip') => {
    hapticSelection();
    posthog.capture('learn_play_first_game', { source });
    requestReplaceActiveGame({
      source: 'learn',
      liveState: state,
      onReplace: () => {
        enableBeginnerGameAids();
        startGame('vs-computer');
        router.replace('/game');
      },
    });
  }, [posthog, startGame, state]);

  const openLesson = useCallback((id: LessonId, source: 'next' | 'list') => {
    hapticLight();
    startLearning();
    posthog.capture('learn_lesson_opened', {
      lesson_id: id,
      completed: progress.completedLessons.includes(id),
      source,
    });
    router.push(`/learn/${id}`);
  }, [posthog, progress.completedLessons, startLearning]);

  const openNext = useCallback(() => {
    if (nextLesson) {
      openLesson(nextLesson.id, 'next');
      return;
    }
    if (ready) {
      playFirstGame('hub_cta');
      return;
    }
    hapticLight();
    posthog.capture('learn_graduation_opened', { source: 'hub' });
    router.push('/learn/graduation');
  }, [nextLesson, openLesson, playFirstGame, posthog, ready]);

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="learn-hub-screen"
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          landscape ? styles.contentLandscape : null,
          contentEdgePadding(insets, { left: 24, right: 24, bottom: landscape ? 16 : 40 }),
        ]}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{translate('learn.subtitle')}</Text>

        <View style={landscape ? styles.nextWide : null}>
          <LearnNextCard
            eyebrow={nextLesson ? translate(done > 0 ? 'learn.next_lesson' : 'learn.hub.first_lesson') : undefined}
            title={nextLesson
              ? translate(nextLesson.titleKey as TxKeyPath)
              : translate(ready ? 'learn.home_cta_ready' : 'learn.home_cta_quiz')}
            body={nextLesson ? translate(nextLesson.subtitleKey as TxKeyPath) : undefined}
            progressLabel={translate('learn.home_cta_progress', { done, total })}
            progress={done / total}
            actionLabel={nextLesson
              ? translate('learn.hub.start_lesson')
              : translate(ready ? 'learn.graduation.play_cta' : 'learn.graduation.quiz_title')}
            onPress={openNext}
          />
        </View>

        <Chapters progress={progress} next={next} wide={landscape} onOpen={openLesson} />

        {ready
          ? null
          : (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                onPress={() => {
                  posthog.capture('learn_skipped_to_play');
                  playFirstGame('hub_skip');
                }}
              >
                <Text style={styles.secondaryLabel}>{translate('learn.skip_to_play')}</Text>
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
    paddingTop: 12,
    gap: 16,
  },
  contentLandscape: {
    maxWidth: PAGE_STAGE_MAX_WIDTH,
    paddingTop: 8,
  },
  subtitle: {
    color: LEARN_INK.muted,
    fontSize: 15,
    lineHeight: 21,
    ...interFont('regular'),
  },
  // Landscape and desktop: the card keeps a phone's measure instead of stretching across the stage.
  nextWide: {
    width: '100%',
    maxWidth: 560,
  },
  chapters: {
    gap: 20,
    marginTop: 4,
  },
  chaptersWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 16,
  },
  chapter: {
    gap: 8,
  },
  chapterWide: {
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 260,
    maxWidth: '100%',
  },
  chapterTitle: {
    paddingHorizontal: 4,
    color: LEARN_INK.ivory,
    fontSize: 17,
    lineHeight: 22,
    ...interFont('semibold'),
  },
  chapterList: {
    overflow: 'hidden',
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: LEARN_INK.hairline,
    ...continuousRadius(18),
  },
  secondaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryLabel: {
    color: LEARN_INK.muted,
    fontSize: 15,
    ...interFont('medium'),
  },
  pressed: {
    opacity: 0.88,
  },
});
