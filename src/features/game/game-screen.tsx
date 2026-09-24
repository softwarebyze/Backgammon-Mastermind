import { router, useFocusEffect, useNavigation } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { deriveGameBoardPresentation } from '@/features/game/game-board-presentation';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenLayout } from '@/features/game/game-screen-layout';
import { guidanceArrowSegments } from '@/features/game/guidance-arrows';
import {
  clearGuidance,
  setGuidanceVerdictPending,
  useGuidance,
  useGuidanceVerdictPending,
} from '@/features/game/guidance-store';
import {
  clearHintArrows,
  setHintArrows,
} from '@/features/game/hint-arrows-store';
import { useGame } from '@/features/game/use-game';
import { useGameInput } from '@/features/game/use-game-input';
import { useGameScreenHeader } from '@/features/game/use-game-screen-header';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { useMoveReview } from '@/features/game/use-move-review';
import { useTutorMode } from '@/features/game/use-tutor';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

/* eslint-disable max-lines-per-function -- screen composes all game slices */
/**
 * True only after `value` has stayed true for `delayMs` without dropping.
 * A delayed flag inherently needs effect → setState, hence the narrow rule
 * exception here.
 */
function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks-extra/no-direct-set-state-in-use-effect -- delayed flag needs effect-driven setState
    setDelayed(false);
    if (!value) {
      return;
    }
    const t = setTimeout(() => setDelayed(true), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return delayed;
}
export function GameScreen() {
  const posthog = usePostHog();
  const navigation = useNavigation();
  const input = useGameInput();
  const {
    moveAnimation,
    resetAnimation,
    moveLog,
    replayBaseline,
    canUndo,
    canRedo,
    doUndo,
    doRedo,
    historyPath,
    ceremonyKey,
    resumeAIScheduling,
    skipAIDelay,
    selectPoint,
  } = useGame();
  // Tutor mode: background blunder-checking for human turns.
  useTutorMode(input.state, moveLog);
  const guidance = useGuidance();
  const guidanceVerdictPending = useGuidanceVerdictPending();
  // A blunder prompt or a pending verdict pauses play. Hint sessions never
  // pause: the player keeps playing with the engine's suggestion on the board.
  const blunderOpen = guidance?.kind === 'blunder';
  const tutorPaused = blunderOpen || guidanceVerdictPending;
  // Only mention the review when the hold is noticeable — the verdict
  // usually lands before the player even notices the pause.
  const showReviewing = useDelayedTrue(guidanceVerdictPending, 600);
  // Leaving the screen drops any guidance session/hold with it.
  useEffect(() => {
    return () => {
      setGuidanceVerdictPending(false);
      clearGuidance();
    };
  }, []);
  // Guidance arrows are derived from the open session, the live position,
  // and the move log — never stored. Mid-turn hint arrows follow the player
  // as moves are played (completed arrows drop off, the rest re-resolve);
  // blunder solution arrows draw both paths from the turn-start board.
  const guidanceArrows = useMemo(
    () => guidanceArrowSegments(guidance, input.state, moveLog),
    [guidance, input.state, moveLog],
  );
  useEffect(() => {
    setHintArrows(guidanceArrows);
    return () => clearHintArrows();
  }, [guidanceArrows]);
  const { leaveGame, handleBackPress, allowLeaveRef } = useLeaveGame();
  const review = useMoveReview({
    liveState: input.state,
    moveLog,
    replayBaseline,
  });

  // Leave-home clears AI timers; same in-memory state won't re-trigger the effect — kick on focus.
  useFocusEffect(useCallback(() => {
    resumeAIScheduling();
    return () => resetAnimation();
  }, [resumeAIScheduling, resetAnimation]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        resumeAIScheduling();
      }
    });
    return () => sub.remove();
  }, [resumeAIScheduling]);

  useEffect(() => {
    if (!input.state) {
      router.replace('/');
    }
  }, [input.state]);

  const openOptions = useCallback(() => {
    posthog.capture('game_options_opened', { mode: input.state?.mode ?? null });
    router.push('/settings');
  }, [posthog, input.state?.mode]);

  useGameScreenHeader({
    navigation,
    state: input.state,
    canUndo: !review.isReviewing && canUndo,
    canRedo: !review.isReviewing && canRedo,
    doUndo,
    doRedo,
    openOptions,
    handleReset: input.handleReset,
    confirmLeaveGame: leaveGame,
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) {
        return;
      }
      if (event.data.action.type === 'GO_BACK' || event.data.action.type === 'POP') {
        event.preventDefault();
        leaveGame();
      }
    });
    return unsubscribe;
  }, [navigation, leaveGame, allowLeaveRef]);

  if (!input.state || !review.displayState) {
    return (
      <View style={[styles.root, styles.center]}>
        <FocusAwareStatusBar />
        <Text style={{ color: GAME_PALETTE.accent }}>{translate('game.controls.loading')}</Text>
      </View>
    );
  }

  const board = deriveGameBoardPresentation(review, moveAnimation, historyPath);
  const state = board.boardState!;
  const isComputerTurn = state.mode === 'vs-computer' && state.currentPlayer === 'black';
  // Pause interaction while the blunder prompt is open or a verdict is pending.
  const interactionEnabled = board.interactionEnabled && !tutorPaused;
  // Revealed solution view: a display-only preview of the turn-start board
  // (interaction stays off — the player acts through the modal buttons).
  const previewState = blunderOpen && guidance?.revealed ? guidance.questionState : null;

  return (
    <View style={styles.screenWrap}>
      <GameScreenLayout
        board={{ ...board, boardState: previewState ?? state, interactionEnabled }}
        review={review}
        input={input}
        moveLog={moveLog}
        isComputerTurn={isComputerTurn || tutorPaused}
        ceremonyKey={ceremonyKey}
        onCancelSelection={() => selectPoint(null)}
        onSkipComputer={skipAIDelay}
      />
      {showReviewing && (
        <View style={styles.reviewingPill} pointerEvents="none">
          <Text style={styles.reviewingText}>Reviewing your turn…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenWrap: {
    flex: 1,
    width: '100%',
    backgroundColor: GAME_PALETTE.bg,
  },
  reviewingPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 18, 14, 0.92)',
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  reviewingText: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    ...interFont('regular'),
  },
});
