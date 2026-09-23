import type { TutorBlunderPrompt } from '@/features/game/tutor-store';

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hintMovesToSegments } from '@/features/game/hint-arrows';
import { setHintArrows } from '@/features/game/hint-arrows-store';
import { clearTutorBlunder, useTutorBlunder } from '@/features/game/tutor-store';
import { useGame } from '@/features/game/use-game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/** How many candidate plays to list with their equities. */
const CANDIDATE_ROWS = 4;

function formatEquity(e: number): string {
  return `${e >= 0 ? '+' : '−'}${Math.abs(e).toFixed(2)}`;
}

function BlunderMessage({ prompt }: { prompt: TutorBlunderPrompt }) {
  return (
    <>
      <Text style={styles.title}>Big blunder!</Text>
      <Text style={styles.message}>
        Your move ranked #
        {prompt.playedRank}
        {' '}
        of
        {' '}
        {prompt.candidateCount}
        {' '}
        (−
        {prompt.loss.toFixed(2)}
        ).
        {'\n'}
        Sage preferred
        {' '}
        {prompt.bestNotation}
        .
      </Text>
    </>
  );
}

function CandidateList({ equities }: { equities: number[] }) {
  const rows = equities.slice(0, CANDIDATE_ROWS);
  const best = rows[0];
  if (best === undefined)
    return null;
  return (
    <View style={styles.candidates} testID="tutor-candidates">
      {rows.map((equity, i) => {
        const error = best - equity;
        return (
          <View key={`${equity.toFixed(3)}-${i}`} style={styles.candidateRow}>
            <Text style={styles.candidateRank}>
              #
              {i + 1}
            </Text>
            <Text style={styles.candidateEquity}>{formatEquity(equity)}</Text>
            <Text style={styles.candidateError}>
              {i === 0 ? 'best' : `−${error.toFixed(2)}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Tutor mode's blunder intervention, XG-style: the game is paused with the
 * blundered position still on the board, and the player can take the move
 * back, ask for a hint (candidate equities included), keep the move anyway,
 * or turn the tutor off. Nothing is auto-replaced.
 *
 * Demo branch: strings are English-only.
 */
export function TutorBlunderModal() {
  const prompt = useTutorBlunder();
  const game = useGame();
  const { setTutorMode } = useGamePreferences();

  if (!prompt) {
    return null;
  }

  const revertTurn = () => {
    const { startState, movesMade } = prompt;
    game.tutorRevertTurn(startState, movesMade);
  };

  const handleTakeBack = () => {
    hapticLight();
    clearTutorBlunder();
    revertTurn();
  };

  const handleHint = () => {
    hapticLight();
    const { bestMoves, startState } = prompt;
    clearTutorBlunder();
    // Back to turn start, then draw Sage's suggestion as arrows.
    revertTurn();
    // Defer one tick so the revert's setState lands first.
    setTimeout(() => {
      setHintArrows(hintMovesToSegments(bestMoves, startState));
    }, 50);
  };

  const handleKeepMove = () => {
    hapticLight();
    // Play anyway: the blunder stands and the game continues.
    clearTutorBlunder();
  };

  const handleTurnOff = () => {
    hapticLight();
    clearTutorBlunder();
    setTutorMode(false);
  };

  const showCandidates = prompt.candidateEquities.length > 0;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleKeepMove}
    >
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityRole="alert" testID="tutor-blunder-modal">
          <BlunderMessage prompt={prompt} />
          {showCandidates && (
            <CandidateList equities={prompt.candidateEquities} />
          )}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take back the move and try again"
              testID="tutor-take-back"
              onPress={handleTakeBack}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
            >
              <Text style={styles.btnPrimaryLabel}>Take back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show a hint for this position"
              testID="tutor-hint"
              onPress={handleHint}
              style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
            >
              <Text style={styles.btnSecondaryLabel}>Hint</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep my move and continue"
              testID="tutor-keep-move"
              onPress={handleKeepMove}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnGhostLabel}>Keep my move</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Turn Tutor mode off"
              testID="tutor-turn-off"
              onPress={handleTurnOff}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnMutedLabel}>Turn Tutor off</Text>
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
  candidates: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    ...continuousRadius(10),
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 2,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 2,
  },
  candidateRank: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    width: 28,
    ...interFont('semibold'),
  },
  candidateEquity: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    flex: 1,
    ...interFont('regular'),
  },
  candidateError: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
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
  btnMutedLabel: {
    color: GAME_PALETTE.textMuted,
    opacity: 0.7,
    fontSize: 13,
    ...interFont('regular'),
  },
  pressed: {
    opacity: 0.88,
  },
});
