import type { GameState } from '@/lib/game';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { BoardView } from '@/features/game/components/board/board-view';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { GameScreenHeader } from '@/features/game/game-screen-header';

import { useGameInput } from '@/features/game/use-game-input';

const GAME_BG = '#1E0C02';

export function GameScreen() {
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
      <SafeAreaView style={[styles.root, styles.center]}>
        <FocusAwareStatusBar />
        <Text style={{ color: '#D4A843' }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const isComputerTurn
    = state.mode === 'vs-computer' && state.currentPlayer === 'black';
  const isHumanTurn = !isComputerTurn;
  const playerLabel = getPlayerLabel(state);

  return (
    <SafeAreaView style={[styles.root, webSafeArea]} edges={['top', 'bottom']}>
      <FocusAwareStatusBar />
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
    </SafeAreaView>
  );
}

function getPlayerLabel(state: GameState) {
  if (state.currentPlayer === 'white') {
    return state.mode === 'vs-computer' ? 'Your Turn' : 'White';
  }
  return state.mode === 'vs-computer' ? 'Computer' : 'Black';
}

const webSafeArea = Platform.OS === 'web'
  ? { paddingTop: 67, paddingBottom: 34 }
  : null;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_BG,
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainer: {
    paddingHorizontal: 4,
  },
});
