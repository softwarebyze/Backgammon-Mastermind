import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoardView } from '@/components/board/BoardView';
import { DiceDisplay } from '@/components/board/DiceDisplay';
import { useGame } from '@/context/GameContext';
import { getLegalMoves } from '@/game';

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { state, doRollDice, selectPoint, doMove, resetGame } = useGame();

  const handlePointPress = useCallback(
    (pointIndex: number) => {
      if (!state || state.phase !== 'moving') return;
      if (state.mode === 'vs-computer' && state.currentPlayer === 'black') return;

      // If a legal target is tapped, execute the move
      if (state.selectedPoint !== null) {
        const move = state.legalMovesForSelected.find(m => m.to === pointIndex);
        if (move) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          doMove(move);
          return;
        }
      }

      // Otherwise select the tapped point
      Haptics.selectionAsync();
      selectPoint(pointIndex);
    },
    [state, doMove, selectPoint]
  );

  const handleBarPress = useCallback(() => {
    if (!state || state.phase !== 'moving') return;
    if (state.mode === 'vs-computer' && state.currentPlayer === 'black') return;
    if (state.bar[state.currentPlayer] === 0) return;

    // If bar is already selected, deselect
    if (state.selectedPoint === 0) {
      selectPoint(null);
      return;
    }

    // Check if any bar move is possible  
    const barMoves = getLegalMoves(state).filter(m => m.from === 0);
    if (barMoves.length === 0) return;

    Haptics.selectionAsync();
    selectPoint(0);
  }, [state, selectPoint]);

  const handleBoardPress = useCallback(() => {
    if (!state) return;
    selectPoint(null);
  }, [state, selectPoint]);

  const handleRoll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    doRollDice();
  }, [doRollDice]);

  const handleReset = useCallback(() => {
    Alert.alert('New Game', 'Start a new game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          resetGame();
        },
      },
    ]);
  }, [resetGame]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  if (!state) {
    return (
      <View style={[styles.center, { backgroundColor: '#1E0C02' }]}>
        <Text style={{ color: '#D4A843' }}>Loading…</Text>
      </View>
    );
  }

  const isComputerTurn =
    state.mode === 'vs-computer' && state.currentPlayer === 'black';
  const isHumanTurn = !isComputerTurn;

  const playerLabel =
    state.currentPlayer === 'white'
      ? state.mode === 'vs-computer'
        ? 'Your Turn'
        : 'White'
      : state.mode === 'vs-computer'
      ? 'Computer'
      : 'Black';

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#D4A843" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View
            style={[
              styles.playerBadge,
              { backgroundColor: state.currentPlayer === 'white' ? '#F2EAD3' : '#1E1E30' },
            ]}
          />
          <Text style={styles.headerTitle}>{playerLabel}</Text>
          {state.phase === 'game-over' && (
            <Text style={styles.winnerBadge}>
              {state.winner === 'white'
                ? state.mode === 'vs-computer'
                  ? ' 🏆 You Win!'
                  : ' 🏆 White Wins!'
                : state.mode === 'vs-computer'
                ? ' Computer Wins'
                : ' Black Wins'}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={handleReset} style={styles.iconBtn} hitSlop={12}>
          <Feather name="refresh-cw" size={20} color="#D4A843" />
        </TouchableOpacity>
      </View>

      {/* ── Pip count ── */}
      <View style={styles.pipRow}>
        <View style={styles.pipItem}>
          <View style={[styles.pipDot, { backgroundColor: '#F2EAD3' }]} />
          <Text style={styles.pipText}>White: {state.borneOff.white}/15</Text>
        </View>
        <View style={styles.pipItem}>
          <View style={[styles.pipDot, { backgroundColor: '#1E1E30' }]} />
          <Text style={styles.pipText}>Black: {state.borneOff.black}/15</Text>
        </View>
      </View>

      {/* ── Board ── */}
      <Pressable onPress={handleBoardPress} style={styles.boardContainer}>
        <BoardView
          state={state}
          onPointPress={handlePointPress}
          onBarPress={handleBarPress}
        />
      </Pressable>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Dice */}
        <View style={styles.diceRow}>
          <DiceDisplay
            dice={state.dice}
            remainingDice={state.remainingDice}
            playerColor={state.currentPlayer}
          />
        </View>

        {/* Action area */}
        {state.phase === 'game-over' ? (
          <TouchableOpacity style={styles.rollBtn} onPress={handleReset}>
            <Text style={styles.rollBtnText}>Play Again</Text>
          </TouchableOpacity>
        ) : state.phase === 'rolling' ? (
          isHumanTurn ? (
            <TouchableOpacity style={styles.rollBtn} onPress={handleRoll}>
              <Text style={styles.rollBtnText}>Roll Dice</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.rollBtn, { backgroundColor: '#3A2010', borderColor: '#5A3020' }]}>
              <Text style={[styles.rollBtnText, { color: '#8A6040' }]}>Computer Rolling…</Text>
            </View>
          )
        ) : state.phase === 'moving' ? (
          isComputerTurn ? (
            <View style={[styles.rollBtn, { backgroundColor: '#3A2010', borderColor: '#5A3020' }]}>
              <Text style={[styles.rollBtnText, { color: '#8A6040' }]}>Computer Moving…</Text>
            </View>
          ) : (
            <View style={[styles.rollBtn, { backgroundColor: '#2A3A20', borderColor: '#4A6A30' }]}>
              <Text style={[styles.rollBtnText, { color: '#A0D080' }]}>
                {state.selectedPoint !== null
                  ? 'Tap a highlighted point to move'
                  : 'Select a checker to move'}
              </Text>
            </View>
          )
        ) : null}
      </View>
    </View>
  );
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
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#D4A843',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  winnerBadge: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  playerBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#BBA070',
  },
  iconBtn: {
    padding: 8,
  },
  pipRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  pipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BBA070',
  },
  pipText: {
    color: '#A08060',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  boardContainer: {
    paddingHorizontal: 4,
  },
  controls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  diceRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    minHeight: 50,
  },
  rollBtn: {
    backgroundColor: '#8B1A1A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C83030',
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  rollBtnText: {
    color: '#F2EAD3',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});
