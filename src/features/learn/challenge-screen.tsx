import type { TxKeyPath } from '@/lib/i18n';
import type { ChallengeId } from '@/lib/learn/challenges';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { CelebrationOverlay } from '@/features/learn/celebration-overlay';
import { useChallengeSession } from '@/features/learn/use-challenge-session';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { translate } from '@/lib/i18n';
import { calculateStars, getChallenge, getNextChallengeId } from '@/lib/learn/challenges';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  challengeId: ChallengeId;
};

export function ChallengeScreen({ challengeId }: Props) {
  const challenge = getChallenge(challengeId);
  const navigation = useNavigation();
  const { completeChallenge, startLearning } = useLearnProgress();
  const { preferences } = useGamePreferences();

  useEffect(() => {
    startLearning();
  }, [startLearning]);

  useLayoutEffect(() => {
    if (!challenge) {
      return;
    }
    navigation.setOptions({
      title: translate(challenge.titleKey as TxKeyPath),
    });
  }, [challenge, navigation]);

  if (!challenge) {
    return (
      <View style={styles.root}>
        <FocusAwareStatusBar />
      </View>
    );
  }

  return (
    <ChallengeScreenBody
      key={challengeId}
      challenge={challenge}
      challengeId={challengeId}
      completeChallenge={completeChallenge}
      diceDisplayStyle={preferences.diceDisplayStyle}
    />
  );
}

/* eslint-disable max-lines-per-function -- challenge board + coach + celebration */
function ChallengeScreenBody({
  challenge,
  challengeId,
  completeChallenge,
  diceDisplayStyle,
}: {
  challenge: NonNullable<ReturnType<typeof getChallenge>>;
  challengeId: ChallengeId;
  completeChallenge: (id: ChallengeId, xp: number, stars: 1 | 2 | 3) => void;
  diceDisplayStyle: 'numbers' | 'dots';
}) {
  const session = useChallengeSession(challenge);
  const showPointNumbers = session.aids?.showPointNumbers ?? false;
  const dimensions = useBoardDimensions({
    showPointNumbers,
    extraChrome: 80,
  });

  const { setBoardDimensions } = session;
  useEffect(() => {
    setBoardDimensions(dimensions);
  }, [dimensions, setBoardDimensions]);

  const stepComplete = session.stepComplete;
  const phase = session.phase;

  const goNext = useCallback(() => {
    const nextId = getNextChallengeId(challengeId);
    if (nextId) {
      router.replace(`/learn/${nextId}`);
    }
    else {
      router.replace('/learn');
    }
  }, [challengeId]);

  const celebrationStars = stepComplete && phase === 'do'
    ? calculateStars(session.attempts.current, session.hintsUsed)
    : 1;
  const celebrationXp = stepComplete && phase === 'do'
    ? challenge.xpReward + (celebrationStars === 3 ? 5 : celebrationStars === 2 ? 3 : 0)
    : 0;

  useEffect(() => {
    if (!stepComplete || phase !== 'do') {
      return;
    }
    completeChallenge(challengeId, celebrationXp, celebrationStars);
  }, [
    celebrationStars,
    celebrationXp,
    challengeId,
    completeChallenge,
    phase,
    stepComplete,
  ]);

  const awaitingBoardAction
    = session.phase === 'do'
      && !session.stepComplete;

  const onPrimary = useCallback(() => {
    if (session.phase === 'show') {
      session.startDoPhase();
      return;
    }
    if (awaitingBoardAction) {
      session.showHint();
      return;
    }
    if (session.stepComplete && session.phase === 'do') {
      goNext();
    }
  }, [awaitingBoardAction, goNext, session]);

  const primaryLabel = session.phase === 'show'
    ? translate('learn.challenge.try_it')
    : awaitingBoardAction
      ? translate('learn.hint')
      : session.stepComplete
        ? translate('learn.challenge.next')
        : translate('learn.continue');

  const showDice
    = session.phase === 'do'
      && (session.state.dice[0] !== 0 || session.state.dice[1] !== 0);

  return (
    <>
      <FocusAwareStatusBar />
      <View style={styles.root}>
        {session.phase === 'show'
          ? (
              <View style={styles.showCard}>
                <Text style={styles.showTitle}>
                  {translate(challenge.showTitleKey as TxKeyPath)}
                </Text>
                {challenge.concepts?.length
                  ? (
                      <View style={styles.chipWrap}>
                        {challenge.concepts.map(concept => (
                          <View key={concept.termKey} style={styles.chip}>
                            <Text style={styles.chipTerm}>
                              {translate(concept.termKey as TxKeyPath)}
                            </Text>
                            <Text style={styles.chipDef}>
                              {translate(concept.definitionKey as TxKeyPath)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )
                  : null}
                <Text style={styles.showBody}>
                  {translate(challenge.showBodyKey as TxKeyPath)}
                </Text>
              </View>
            )
          : (
              <>
                <View style={styles.caption}>
                  {session.feedback && !stepComplete
                    ? (
                        <Text
                          style={[
                            styles.feedback,
                            {
                              color:
                                session.feedback.tone === 'praise'
                                  ? '#A0D080'
                                  : session.feedback.tone === 'soft'
                                    ? GAME_PALETTE.accent
                                    : GAME_PALETTE.accentDim,
                            },
                          ]}
                        >
                          {translate(
                            session.feedback.messageKey,
                            session.feedback.messageOptions,
                          )}
                        </Text>
                      )
                    : null}
                </View>

                <View style={styles.boardWrap}>
                  <Pressable
                    onPress={session.onBoardPress}
                    style={[styles.boardContainer, { maxWidth: dimensions.boardOuterWidth }]}
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
                      interactionEnabled={session.phase === 'do' && !session.stepComplete}
                      aidsOverride={session.aids}
                      emphasisPoints={session.emphasisPoints}
                      emphasisBar={session.emphasisBar}
                      moveGuide={session.moveGuide}
                    />
                  </Pressable>
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
              </>
            )}

        {session.phase === 'do' && session.stepComplete
          ? (
              <CelebrationOverlay
                stars={celebrationStars}
                xpEarned={celebrationXp}
                messageKey={challenge.step.praiseKey as TxKeyPath}
                onNext={goNext}
              />
            )
          : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          style={({ pressed }) => [
            awaitingBoardAction ? styles.hintBtn : styles.primaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={onPrimary}
        >
          <Text style={awaitingBoardAction ? styles.hintLabel : styles.primaryLabel}>
            {primaryLabel}
          </Text>
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
  showCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
    maxWidth: 400,
    width: '100%',
  },
  showTitle: {
    color: GAME_PALETTE.accent,
    fontSize: 24,
    textAlign: 'center',
    ...interFont('bold'),
  },
  chipWrap: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 67, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  chipTerm: {
    color: GAME_PALETTE.accent,
    fontSize: 14,
    ...interFont('bold'),
  },
  chipDef: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    ...interFont('regular'),
  },
  showBody: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    ...interFont('regular'),
  },
  caption: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  feedback: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('medium'),
    backgroundColor: GAME_PALETTE.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
    ...continuousRadius(10),
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
  diceRow: {
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 8,
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
