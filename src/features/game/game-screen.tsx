import type { GameState } from '@/lib/game';
import { router } from 'expo-router';
import { useNavigation } from 'expo-router/react-navigation';
import { useCallback, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { useGameInput } from '@/features/game/use-game-input';
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
    handleReset,
  } = useGameInput();

  const openOptions = useCallback(() => {
    hapticLight();
    router.push('/game/options');
  }, []);

  const playerLabel = state ? getPlayerLabel(state) : '';

  useLayoutEffect(() => {
    if (!state) {
      return;
    }
    navigation.setOptions({
      title: playerLabel,
      headerRight: () => (
        <GameHeaderActions onOptions={openOptions} onReset={handleReset} />
      ),
    });
  }, [navigation, state, playerLabel, handleReset, openOptions]);

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
      <View style={styles.boardWrap}>
        <Pressable
          onPress={handleBoardPress}
          style={[styles.boardContainer, { maxWidth: dimensions.boardWidth }]}
        >
          <BoardView
            state={state}
            dimensions={dimensions}
            previewTarget={previewTarget}
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
        onReset={handleReset}
      />
    </View>
  );
}

function getPlayerLabel(state: GameState) {
  if (state.currentPlayer === 'white') {
    return state.mode === 'vs-computer' ? 'Your Turn' : 'White';
  }
  return state.mode === 'vs-computer' ? 'Computer' : 'Black';
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
