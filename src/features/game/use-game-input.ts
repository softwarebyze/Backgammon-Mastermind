import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useMemo } from 'react';

import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { useDiceOrder } from '@/features/game/use-dice-order';
import { useGame } from '@/features/game/use-game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';

/** Haptics throw on Android emulators and some devices — never block gameplay. */
function triggerHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

export function useGameInput({ interactionEnabled = true }: { interactionEnabled?: boolean } = {}) {
  const posthog = usePostHog();
  const { state, doRollDice, doPassTurn, selectPoint, doMove, doMoveSequence, resetGame, isAnimating, moveAnimation, getMoveState } = useGame();

  const { preferences } = useGamePreferences();
  const { displayedDice, reversedRef, swapDice } = useDiceOrder(state);

  const isHumanTurn = !!state
    && !(state.mode === 'vs-computer' && state.currentPlayer === 'black');

  const actions = useMemo(
    () => ({ selectPoint, doMove, doMoveSequence, getMoveState }),
    [selectPoint, doMove, doMoveSequence, getMoveState],
  );

  const onMoveMade = useCallback((inputType: 'tap' | 'drag' | 'bear_off') => {
    posthog.capture('move_made', { input_type: inputType, mode: state?.mode ?? null });
  }, [posthog, state?.mode]);

  const {
    previewTarget,
    dragFrom,
    setBoardDimensions,
    inputNudge,
    handlePointPress,
    handlePointPressIn,
    handlePointPressOut,
    handleDragAttempt,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    handleBearOffPress,
    handleBarPress,
    handleBoardPress,
    clearPendingDrop,
  } = useBoardPlayInput({
    state,
    isAnimating: isAnimating && (!moveAnimation?.committed || !!moveAnimation.inputBlocked),
    concurrentMoves: true,
    moveInDiceOrder: preferences.moveInDiceOrder,
    diceOrderReversed: reversedRef,
    isHumanTurn,
    interactionEnabled,
    actions,
    onMoveMade,
  });

  const handlePassTurn = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    doPassTurn();
  }, [doPassTurn]);

  /** Confirm move setting: same as pass once dice/moves are spent. */
  const handleConfirmMove = handlePassTurn;

  const handleRoll = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    posthog.capture('dice_rolled', { mode: state?.mode ?? null, phase: state?.phase ?? null });
    doRollDice();
  }, [posthog, state?.mode, state?.phase, doRollDice]);

  const handleReset = useCallback(() => {
    const startNew = () => {
      clearPendingDrop();
      triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      posthog.capture('game_reset', {
        mode: state?.mode ?? null,
        was_game_over: state?.phase === 'game-over',
      });
      resetGame();
    };
    requestReplaceActiveGame({
      source: 'reset',
      liveState: state,
      onReplace: startNew,
    });
  }, [clearPendingDrop, posthog, resetGame, state]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return {
    state,
    displayedDice,
    swapDice,
    previewTarget,
    dragFrom,
    setBoardDimensions,
    inputNudge,
    handlePointPress,
    handlePointPressIn,
    handlePointPressOut,
    handleDragAttempt,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    handleBearOffPress,
    handleBarPress,
    handleBoardPress,
    handleRoll,
    handlePassTurn,
    handleConfirmMove,
    handleReset,
    handleBack,
  };
}
