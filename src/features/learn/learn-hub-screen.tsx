import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { LessonRow } from '@/features/learn/lesson-row';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { enableBeginnerGameAids } from '@/lib/game-preferences/beginner-aids';
import { hapticLight } from '@/lib/haptics';
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
import { continuousRadius } from '@/lib/ui/native-styles';

export function LearnHubScreen() {
  const { progress, startLearning } = useLearnProgress();
  const done = completedLessonCount(progress);
  const total = LESSON_IDS.length;
  const ready = isReadyToPlay(progress);
  const lessonsDone = allLessonsComplete(progress);

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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

        <View style={styles.list}>
          {LESSONS.map((lesson) => {
            const completed = progress.completedLessons.includes(lesson.id);
            const unlocked = isLessonUnlocked(lesson.id, progress.completedLessons);
            return (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                completed={completed}
                unlocked={unlocked}
                onPress={() => {
                  hapticLight();
                  startLearning();
                  router.push(`/learn/${lesson.id}`);
                }}
              />
            );
          })}
        </View>

        {lessonsDone
          ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={() => {
                  hapticLight();
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
            hapticLight();
            enableBeginnerGameAids();
            router.replace('/');
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
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
