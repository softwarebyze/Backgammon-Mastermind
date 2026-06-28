import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { GameHomeButton } from '@/components/navigation/game-home-button';
import { FocusAwareStatusBar } from '@/components/ui';
import { GameBoardSection } from '@/features/game/components/game-board-section';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { MoveReviewBar } from '@/features/game/components/move-review-bar';
import { TurnIndicatorBanner } from '@/features/game/components/turn-indicator-banner';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { useGame } from '@/features/game/use-game';
import { useGameInput } from '@/features/game/use-game-input';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { useMoveReview } from '@/features/game/use-move-review';

export function GameScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const input = useGameInput();
  const { moveAnimation, resetAnimation, moveLog, replayBaseline } = useGame();
  const { leaveGame, handleBackPress, allowLeaveRef } = useLeaveGame();
  const review = useMoveReview({ liveState: input.state, moveLog, replayBaseline });

  useFocusEffect(useCallback(() => () => resetAnimation(), [resetAnimation]));

  const openOptions = useCallback(() => {
    router.push('/game/options');
  }, []);

  useLayoutEffect(() => {
    if (!input.state) {
      return;
    }
    navigation.setOptions({
      title: '',
      headerLeft: () => <GameHomeButton onPress={leaveGame} />,
      headerRight: () => (
        <GameHeaderActions onOptions={openOptions} onReset={input.handleReset} />
      ),
    });
  }, [navigation, input.state, input.handleReset, openOptions, leaveGame]);

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

  const boardState = review.displayState;
  const boardAnimation = review.isReviewing ? review.reviewAnimation : moveAnimation;
  const interactionEnabled = !review.isReviewing && !boardAnimation;
  const isComputerTurn = boardState.mode === 'vs-computer' && boardState.currentPlayer === 'black';

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <FocusAwareStatusBar />
      <GamePipStatusBar state={boardState} />
      <View style={styles.turnBannerWrap}>
        <TurnIndicatorBanner state={boardState} />
      </View>
      <GameBoardSection
        boardState={boardState}
        boardAnimation={boardAnimation}
        interactionEnabled={interactionEnabled}
        isReviewing={review.isReviewing}
        previewTarget={input.previewTarget}
        reviewEntry={review.isReviewing ? review.activeEntry : null}
        reviewBeforeState={review.isReviewing ? review.reviewBeforeState : null}
        input={input}
      />
      <View style={styles.reviewSlot}>
        <MoveReviewBar
          viewIndex={review.viewIndex}
          liveIndex={review.liveIndex}
          isReviewing={review.isReviewing}
          moveLog={moveLog}
          focusedPly={review.focusedPly}
          positionLabel={review.positionLabel}
          canStepBack={review.canStepBack}
          canStepForward={review.canStepForward}
          onStepBack={review.stepBack}
          onStepForward={review.stepForward}
          onJumpToPly={review.jumpToPly}
          onGoLive={review.goLive}
        />
      </View>
      <GameScreenControls
        state={boardState}
        isHumanTurn={!isComputerTurn && interactionEnabled}
        isComputerTurn={isComputerTurn}
        isReviewing={review.isReviewing}
        onRoll={input.handleRoll}
        onReset={input.handleReset}
        onGoLive={review.goLive}
      />
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
  turnBannerWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  reviewSlot: {
    width: '100%',
    alignItems: 'center',
    minHeight: 68,
  },
});
