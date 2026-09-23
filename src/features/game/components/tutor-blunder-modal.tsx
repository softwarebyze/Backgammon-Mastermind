import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hintMovesToSegments } from '@/features/game/hint-arrows';
import { setHintArrows } from '@/features/game/hint-arrows-store';
import { clearTutorBlunder, useTutorBlunder } from '@/features/game/tutor-store';
import { useGame } from '@/features/game/use-game';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * Tutor mode's blunder intervention: pauses the game when a big blunder is
 * detected and offers three choices — play Sage's move instead, go back and
 * try again, or see the suggestion as board arrows.
 *
 * Demo branch: strings are English-only.
 */
export function TutorBlunderModal() {
  const prompt = useTutorBlunder();
  const game = useGame();

  if (!prompt) {
    return null;
  }

  const dismiss = () => {
    hapticLight();
    clearTutorBlunder();
  };

  const handlePlayBest = () => {
    hapticLight();
    const { startState, movesMade, bestMoves } = prompt;
    clearTutorBlunder();
    // Revert the blundered turn and auto-play Sage's line.
    game.tutorApplyBestMoves(startState, movesMade, bestMoves);
  };

  const handleTryAgain = () => {
    hapticLight();
    const { startState, movesMade } = prompt;
    clearTutorBlunder();
    game.tutorRevertTurn(startState, movesMade);
  };

  const handleShowSuggestion = () => {
    hapticLight();
    const { startState, movesMade, bestMoves } = prompt;
    clearTutorBlunder();
    // Back to turn start, then draw Sage's suggestion as arrows.
    game.tutorRevertTurn(startState, movesMade);
    // Defer one tick so the revert's setState lands first.
    setTimeout(() => {
      setHintArrows(hintMovesToSegments(bestMoves, startState));
    }, 50);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={dismiss}
    >
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityRole="alert" testID="tutor-blunder-modal">
          <Text style={styles.title}>Big blunder!</Text>
          <Text style={styles.message}>
            Sage preferred
            {' '}
            {prompt.bestNotation}
            {' '}
            (−
            {prompt.loss.toFixed(2)}
            ).
          </Text>
          <Text style={styles.sub}>
            Want to fix it?
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play Sage's move instead"
              testID="tutor-play-best"
              onPress={handlePlayBest}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
            >
              <Text style={styles.btnPrimaryLabel}>Play Sage&apos;s move</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back and try again"
              testID="tutor-try-again"
              onPress={handleTryAgain}
              style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
            >
              <Text style={styles.btnSecondaryLabel}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show me the suggestion"
              testID="tutor-show-suggestion"
              onPress={handleShowSuggestion}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnGhostLabel}>Show suggestion</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: GAME_PALETTE.surface,
    padding: 22,
    gap: 10,
    ...continuousRadius(16),
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.accent,
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 20,
    textAlign: 'center',
    ...interFont('bold'),
  },
  message: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    ...interFont('regular'),
  },
  sub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    ...interFont('regular'),
  },
  actions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...continuousRadius(10),
  },
  btnPrimary: {
    backgroundColor: GAME_PALETTE.accent,
  },
  btnPrimaryLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 16,
    ...interFont('semibold'),
  },
  btnSecondary: {
    backgroundColor: 'rgba(232, 224, 208, 0.12)',
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
  },
  btnSecondaryLabel: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
