import type { GameMode, GameState } from '@/lib/game';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';

import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { confirmAction } from '@/lib/confirm';
import { canContinueSavedGame, isResumableGame } from '@/lib/game/persistence';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import { WEB_HEADER_INSET } from '@/lib/ui/web-layout';

function startGameFromHome(
  mode: GameMode,
  state: GameState | null,
  startGame: (mode: GameMode) => void,
) {
  hapticLight();
  if (!isResumableGame(state)) {
    startGame(mode);
    router.replace('/game');
    return;
  }

  if (Platform.OS === 'web') {
    // ponytail: window.confirm is binary — OK = new game; Resume on home continues
    confirmAction({
      title: 'Game in progress',
      message: 'Start a new game? (Use Resume on the home screen to continue the current one.)',
      confirmLabel: 'New game',
      destructive: true,
      onConfirm: () => {
        startGame(mode);
        router.replace('/game');
      },
    });
    return;
  }

  Alert.alert(
    'Game in progress',
    'Continue your current game or start a new one?',
    [
      { text: 'Continue', onPress: () => router.replace('/game') },
      {
        text: 'New game',
        style: 'destructive',
        onPress: () => {
          startGame(mode);
          router.replace('/game');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}

function resumeGameFromHome(state: GameState | null, resumeGame: () => boolean) {
  hapticLight();
  if (isResumableGame(state)) {
    router.replace('/game');
    return;
  }
  if (resumeGame()) {
    router.replace('/game');
  }
}

export function HomeScreen() {
  const { state, startGame, resumeGame } = useGame();
  const canResume = canContinueSavedGame(state);

  const handleStart = useCallback(
    (mode: GameMode) => startGameFromHome(mode, state, startGame),
    [startGame, state],
  );

  const handleResume = useCallback(
    () => resumeGameFromHome(state, resumeGame),
    [resumeGame, state],
  );

  return (
    <>
      <FocusAwareStatusBar />
      <View style={styles.root}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/brand/display-logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Text accessibilityRole="header" style={styles.title}>BACKGAMMON</Text>
        <Text style={styles.subtitle}>Master the board — one move at a time</Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDiamond} />
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.buttons}>
          {canResume && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume saved game"
              style={({ pressed }) => [styles.modeBtn, styles.resumeBtn, pressed && styles.pressed]}
              onPress={handleResume}
            >
              <View style={styles.btnIconSlot}>
                <Feather name="play-circle" size={24} color="#A0D080" />
              </View>
              <View style={styles.btnTextCol}>
                <Text style={[styles.btnLabel, { color: '#A0D080' }]}>Resume Game</Text>
                <Text style={[styles.btnSub, { color: '#6A9A50' }]}>Continue where you left off</Text>
              </View>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play against the computer"
            style={({ pressed }) => [styles.modeBtn, styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => handleStart('vs-computer')}
          >
            <View style={styles.btnIconSlot}>
              <Feather name="cpu" size={24} color={GAME_PALETTE.bg} />
            </View>
            <View style={styles.btnTextCol}>
              <Text style={[styles.btnLabel, { color: GAME_PALETTE.bg }]}>vs Computer</Text>
              <Text style={[styles.btnSub, { color: '#4A2A10' }]}>Play against AI</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play with two players locally"
            style={({ pressed }) => [styles.modeBtn, styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => handleStart('vs-human')}
          >
            <View style={styles.btnIconSlot}>
              <Feather name="users" size={24} color={GAME_PALETTE.accent} />
            </View>
            <View style={styles.btnTextCol}>
              <Text style={[styles.btnLabel, { color: GAME_PALETTE.accent }]}>2 Players</Text>
              <Text style={[styles.btnSub, { color: GAME_PALETTE.accentDim }]}>Pass & play locally</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>New here?</Text>
          <Text style={styles.rulesText}>
            During a game, tap the sliders icon for hints and options.
          </Text>
          <Text style={styles.rulesText}>• Roll dice, then tap one of your checkers</Text>
          <Text style={styles.rulesText}>• Hit lone blots to send them to the bar</Text>
          <Text style={styles.rulesText}>• Bear off all 15 checkers to win</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? WEB_HEADER_INSET : 8,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 110,
    height: 110,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: GAME_PALETTE.accent,
    backgroundColor: GAME_PALETTE.bg,
    marginBottom: 20,
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(212, 168, 67, 0.35)',
    ...continuousRadius(28),
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    color: GAME_PALETTE.accent,
    letterSpacing: 4,
    ...interFont('extrabold'),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: GAME_PALETTE.accentDim,
    marginTop: 4,
    letterSpacing: 1,
    ...interFont('regular'),
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginVertical: 24,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    backgroundColor: GAME_PALETTE.accent,
    transform: [{ rotate: '45deg' }],
  },
  buttons: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
    marginBottom: 24,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 2,
    gap: 16,
    ...continuousRadius(16),
  },
  pressed: {
    opacity: 0.88,
  },
  resumeBtn: {
    backgroundColor: '#1A2A14',
    borderColor: '#4A6A30',
  },
  primaryBtn: {
    backgroundColor: GAME_PALETTE.accent,
    borderColor: '#F0C060',
  },
  secondaryBtn: {
    backgroundColor: GAME_PALETTE.surface,
    borderColor: GAME_PALETTE.accentDim,
  },
  btnIconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 17,
    ...interFont('bold'),
  },
  btnSub: {
    fontSize: 12,
    marginTop: 2,
    ...interFont('regular'),
  },
  rulesCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    padding: 16,
    gap: 6,
    ...continuousRadius(14),
  },
  rulesTitle: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    ...interFont('bold'),
    marginBottom: 4,
    letterSpacing: 1,
  },
  rulesText: {
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    ...interFont('regular'),
    lineHeight: 18,
  },
});
