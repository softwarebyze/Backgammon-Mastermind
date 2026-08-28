import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { LessonRow } from '@/features/learn/lesson-row';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { enableBeginnerGameAids } from '@/lib/game-preferences/beginner-aids';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import {
  isLessonUnlocked,
  LESSON_IDS,
  LESSONS,
} from '@/lib/learn/curriculum';
import {
  allLessonsComplete,
  completedLessonCount,
  isReadyToPlay,
} from '@/lib/learn/progress';
import { interFont } from '@/lib/ui/fonts';
import { GAME_CHROME_MAX_WIDTH, isLandscapeLayout } from '@/lib/ui/game-chrome';
import { continuousRadius } from '@/lib/ui/native-styles';

/* eslint-disable-next-line max-lines-per-function -- hub list + skip CTA */
export function LearnHubScreen() {
  const { progress, startLearning } = useLearnProgress();
  const { startGame } = useGame();
  const posthog = usePostHog();
  const { width, height } = useWindowDimensions();
  const landscape = isLandscapeLayout(width, height);
  const done = completedLessonCount(progress);
  const total = LESSON_IDS.length;
  const ready = isReadyToPlay(progress);
  const lessonsDone = allLessonsComplete(progress);

  useEffect(() => {
    posthog.capture('learn_hub_opened', {
      lessons_completed: done,
      quiz_passed: progress.quizPassed,
    });
  }, [done, posthog, progress.quizPassed]);

  const playFirstGame = useCallback((source: 'hub_cta' | 'hub_skip') => {
    hapticSelection();
    posthog.capture('learn_play_first_game', { source });
    enableBeginnerGameAids();
    startGame('vs-computer');
    router.replace('/game');
  }, [posthog, startGame]);

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, landscape ? styles.contentLandscape : null]}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{translate('learn.subtitle')}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {translate('learn.home_cta_progress', { done, total })}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((done / total) * 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={[styles.list, landscape ? styles.listLandscape : null]}>
          {LESSONS.map((lesson) => {
            const completed = progress.completedLessons.includes(lesson.id);
            const unlocked = isLessonUnlocked(lesson.id, progress.completedLessons);
            return (
              <View key={lesson.id} style={landscape ? styles.lessonCell : null}>
                <LessonRow
                  lesson={lesson}
                  completed={completed}
                  unlocked={unlocked}
                  onPress={() => {
                    hapticLight();
                    startLearning();
                    posthog.capture('learn_lesson_opened', {
                      lesson_id: lesson.id,
                      completed,
                    });
                    router.push(`/learn/${lesson.id}`);
                  }}
                />
              </View>
            );
          })}
        </View>

        {lessonsDone
          ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={() => {
                  if (ready) {
                    playFirstGame('hub_cta');
                    return;
                  }
                  hapticLight();
                  posthog.capture('learn_graduation_opened', { source: 'hub' });
                  router.push('/learn/graduation');
                }}
              >
                <Text style={styles.primaryLabel}>
                  {ready
                    ? translate('learn.graduation.play_cta')
                    : translate('learn.graduation.quiz_title')}
                </Text>
              </Pressable>
            )
          : null}

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
    gap: 12,
  },
  contentLandscape: {
    maxWidth: 920,
    paddingTop: 8,
    paddingBottom: 16,
  },
  subtitle: {
    color: GAME_PALETTE.accentDim,
    fontSize: 14,
    ...interFont('regular'),
  },
  progressRow: {
    gap: 8,
    marginBottom: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: GAME_PALETTE.surface,
    overflow: 'hidden',
    ...continuousRadius(8),
  },
  progressFill: {
    height: '100%',
    backgroundColor: GAME_PALETTE.accent,
  },
  progressLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('medium'),
  },
  list: {
    gap: 10,
  },
  listLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lessonCell: {
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 260,
    maxWidth: '100%',
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: GAME_PALETTE.accent,
    paddingVertical: 16,
    alignItems: 'center',
    ...continuousRadius(14),
  },
  primaryLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 16,
    ...interFont('bold'),
  },
  secondaryBtn: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: GAME_PALETTE.accentDim,
    fontSize: 14,
    ...interFont('medium'),
  },
  pressed: {
    opacity: 0.88,
  },
});
