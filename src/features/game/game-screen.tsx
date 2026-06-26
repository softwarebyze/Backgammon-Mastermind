import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { GameHomeButton } from '@/components/navigation/game-home-button';
import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { TurnIndicatorBanner } from '@/features/game/components/turn-indicator-banner';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { useGame } from '@/features/game/use-game';
import { useGameInput } from '@/features/game/use-game-input';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { hapticLight } from '@/lib/haptics';

export function GameScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dimensions = useBoardDimensions();
  const {
    state,
    previewTarget,
    handlePointPress,
    handlePointPressIn,
    handlePointPressOut,
    handleBearOffPress,
    handleBarPress,
    handleBoardPress,
    handleRoll,
    handlePassTurn,
    handleReset,
  } = useGameInput();
  const { moveAnimation } = useGame();
  const { confirmLeaveGame, handleBackPress, allowLeaveRef } = useLeaveGame();

  const openOptions = useCallback(() => {
    hapticLight();
    router.push('/game/options');
  }, []);

  useLayoutEffect(() => {
    if (!state) {
      return;
    }
    navigation.setOptions({
      title: '',
      headerLeft: () => <GameHomeButton onPress={confirmLeaveGame} />,
      headerRight: () => (
        <GameHeaderActions onOptions={openOptions} onReset={handleReset} />
      ),
    });
  }, [navigation, state, handleReset, openOptions, confirmLeaveGame]);

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
        confirmLeaveGame();
      }
    });
    return unsubscribe;
  }, [navigation, confirmLeaveGame, allowLeaveRef]);

  if (!state) {
    return (
      <View style={[styles.root, styles.center]}>
        <FocusAwareStatusBar />
        <Text style={{ color: GAME_PALETTE.accent }}>Loading…</Text>
      </View>
    );
  }

  const isComputerTurn
    = state.mode === 'vs-computer' && state.currentPlayer === 'black';
  const isHumanTurn = !isComputerTurn;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <FocusAwareStatusBar />
      <GamePipStatusBar state={state} />
      <View style={styles.turnBannerWrap}>
        <TurnIndicatorBanner state={state} />
      </View>
      <View style={styles.boardWrap}>
        <Pressable
          onPress={handleBoardPress}
          style={[styles.boardContainer, { maxWidth: dimensions.boardOuterWidth }]}
        >
          <BoardView
            state={state}
            dimensions={dimensions}
            previewTarget={previewTarget}
            moveAnimation={moveAnimation}
            onPointPress={handlePointPress}
            onPointPressIn={handlePointPressIn}
            onPointPressOut={handlePointPressOut}
            onBarPress={handleBarPress}
            onBearOffPress={handleBearOffPress}
          />
        </Pressable>
      </View>
      <GameScreenControls
        state={state}
        isHumanTurn={isHumanTurn}
        isComputerTurn={isComputerTurn}
        onRoll={handleRoll}
        onPassTurn={handlePassTurn}
        onReset={handleReset}
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
  boardWrap: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  boardContainer: {
    paddingHorizontal: 4,
    width: '100%',
    alignItems: 'center',
  },
});
