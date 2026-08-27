import { router, useFocusEffect, useNavigation } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { deriveGameBoardPresentation } from '@/features/game/game-board-presentation';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenLayout } from '@/features/game/game-screen-layout';
import { useGame } from '@/features/game/use-game';
import { useGameInput } from '@/features/game/use-game-input';
import { useGameScreenHeader } from '@/features/game/use-game-screen-header';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { useMoveReview } from '@/features/game/use-move-review';

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
    router.push('/game/options');
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
        <Text style={{ color: GAME_PALETTE.accent }}>Loading…</Text>
      </View>
    );
  }

  const board = deriveGameBoardPresentation(review, moveAnimation, historyPath);
  const state = board.boardState!;
  const isComputerTurn = state.mode === 'vs-computer' && state.currentPlayer === 'black';

  return (
    <GameScreenLayout
      board={{ ...board, boardState: state }}
      review={review}
      input={input}
      moveLog={moveLog}
      isComputerTurn={isComputerTurn}
      ceremonyKey={ceremonyKey}
      onCancelSelection={() => selectPoint(null)}
      onSkipComputer={skipAIDelay}
    />
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
});
