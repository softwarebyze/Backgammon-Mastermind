import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { SkillTreeNode } from '@/features/learn/skill-tree-node';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { enableBeginnerGameAids } from '@/lib/game-preferences/beginner-aids';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { CHALLENGES, getChallengesByTier, isChallengeUnlocked, TIERS } from '@/lib/learn/challenges';
import { allChallengesComplete, completedChallengeCount, MAX_STARS, totalStars } from '@/lib/learn/progress';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/* eslint-disable max-lines-per-function -- tier sections + stats + navigation */
export function SkillTreeScreen() {
  const { progress, startLearning } = useLearnProgress();
  const { startGame } = useGame();
  const posthog = usePostHog();
  const done = completedChallengeCount(progress);
  const total = CHALLENGES.length;
  const ready = allChallengesComplete(progress);
  const stars = totalStars(progress);

  const currentChallengeId = useMemo(() => {
    for (const c of CHALLENGES) {
      if (!progress.completedChallenges.includes(c.id)) {
        return c.id;
      }
    }
    return null;
  }, [progress.completedChallenges]);

  useEffect(() => {
    posthog.capture('skill_tree_opened', {
      challenges_completed: done,
      stars,
    });
  }, [done, posthog, stars]);

  const playFirstGame = useCallback(() => {
    hapticSelection();
    posthog.capture('learn_play_first_game', { source: 'skill_tree' });
    enableBeginnerGameAids();
    startGame('vs-computer');
    router.replace('/game');
  }, [posthog, startGame]);

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{translate('learn.title')}</Text>
          <Text style={styles.subtitle}>{translate('learn.subtitle')}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {done}
              /
              {total}
            </Text>
            <Text style={styles.statLabel}>{translate('learn.stats.challenges')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {stars}
              /
              {MAX_STARS}
            </Text>
            <Text style={styles.statLabel}>{translate('learn.stats.stars')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{progress.totalXp}</Text>
            <Text style={styles.statLabel}>{translate('learn.stats.xp')}</Text>
          </View>
        </View>

        {TIERS.map((tier) => {
          const challenges = getChallengesByTier(tier.number);
          if (challenges.length === 0) {
            return null;
          }
          return (
            <View key={tier.number} style={styles.tierSection}>
              <Text style={styles.tierLabel}>
                {translate(tier.titleKey as Parameters<typeof translate>[0])}
              </Text>
              {challenges.map((challenge) => {
                const completed = progress.completedChallenges.includes(challenge.id);
                const unlocked = isChallengeUnlocked(challenge.id, progress.completedChallenges);
                const challengeStars = progress.starsByChallenge[challenge.id] ?? 0;
                return (
                  <SkillTreeNode
                    key={challenge.id}
                    challenge={challenge}
                    completed={completed}
                    unlocked={unlocked}
                    stars={challengeStars as 0 | 1 | 2 | 3}
                    isCurrent={challenge.id === currentChallengeId}
                    onPress={() => {
                      hapticLight();
                      startLearning();
                      posthog.capture('challenge_opened', {
                        challenge_id: challenge.id,
                        completed,
                      });
                      router.push(`/learn/${challenge.id}`);
                    }}
                  />
                );
              })}
            </View>
          );
        })}

        {ready
          ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={playFirstGame}
              >
                <Text style={styles.primaryLabel}>
                  {translate('learn.challenge.play_first_game')}
                </Text>
              </Pressable>
            )
          : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => {
            posthog.capture('learn_skipped_to_play');
            playFirstGame();
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 8,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 22,
    ...interFont('bold'),
  },
  subtitle: {
    color: GAME_PALETTE.accentDim,
    fontSize: 13,
    ...interFont('regular'),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GAME_PALETTE.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(14),
    marginBottom: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
  statValue: {
    color: GAME_PALETTE.accent,
    fontSize: 18,
    ...interFont('bold'),
  },
  statLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 11,
    ...interFont('medium'),
  },
  tierSection: {
    gap: 8,
    marginTop: 8,
  },
  tierLabel: {
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    ...interFont('medium'),
    paddingLeft: 4,
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
