import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useMemo } from 'react';

import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { useGame } from '@/features/game/use-game';
import { confirmAction } from '@/lib/confirm';
import { translate } from '@/lib/i18n';

/** Haptics throw on Android emulators and some devices — never block gameplay. */
function triggerHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

export function useGameInput() {
  const posthog = usePostHog();
  const { state, doRollDice, doPassTurn, selectPoint, doMove, doMoveSequence, resetGame, isAnimating } = useGame();

  const isHumanTurn = !!state
    && !(state.mode === 'vs-computer' && state.currentPlayer === 'black');

  const actions = useMemo(
    () => ({ selectPoint, doMove, doMoveSequence }),
    [selectPoint, doMove, doMoveSequence],
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
    isAnimating,
    isHumanTurn,
    actions,
    onMoveMade,
  });

  const handlePassTurn = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    doPassTurn();
  }, [doPassTurn]);

  const handleRoll = useCallback(() => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    posthog.capture('dice_rolled', { mode: state?.mode ?? null, phase: state?.phase ?? null });
    doRollDice();
  }, [posthog, state?.mode, state?.phase, doRollDice]);

  const handleReset = useCallback(() => {
    confirmAction({
      title: translate('game.controls.new_game_title'),
      message: translate('game.controls.new_game_message'),
      confirmLabel: translate('game.controls.new_game_title'),
      destructive: true,
      onConfirm: () => {
        clearPendingDrop();
        triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
        posthog.capture('game_reset', {
          mode: state?.mode ?? null,
          was_game_over: state?.phase === 'game-over',
        });
        resetGame();
      },
    });
  }, [clearPendingDrop, posthog, resetGame, state?.mode, state?.phase]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return {
    state,
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
    handleReset,
    handleBack,
  };
}
