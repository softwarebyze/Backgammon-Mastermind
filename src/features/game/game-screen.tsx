import type { GameState } from '@/lib/game';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoardView } from '@/features/game/components/board/board-view';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { GameScreenHeader } from '@/features/game/game-screen-header';

import { useGameInput } from '@/features/game/use-game-input';

export function GameScreen() {
  const insets = useSafeAreaInsets();
  const {
    state,
    handlePointPress,
    handleBarPress,
    handleBoardPress,
    handleRoll,
    handleReset,
    handleBack,
  } = useGameInput();

  if (!state) {
    return (
      <View style={[styles.center, { backgroundColor: '#1E0C02' }]}>
        <Text style={{ color: '#D4A843' }}>Loading…</Text>
      </View>
    );
  }

  const isComputerTurn
    = state.mode === 'vs-computer' && state.currentPlayer === 'black';
  const isHumanTurn = !isComputerTurn;
  const playerLabel = getPlayerLabel(state);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <StatusBar barStyle="light-content" />
      <GameScreenHeader
        state={state}
        playerLabel={playerLabel}
        onBack={handleBack}
        onReset={handleReset}
      />
      <Pressable onPress={handleBoardPress} style={styles.boardContainer}>
        <BoardView
          state={state}
          onPointPress={handlePointPress}
          onBarPress={handleBarPress}
        />
      </Pressable>
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
    backgroundColor: '#1E0C02',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainer: {
    paddingHorizontal: 4,
  },
});
