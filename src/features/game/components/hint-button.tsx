import type { GameState } from '@/lib/game/types';

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { primaryEngine } from '@/features/game/engine';
import { getEngineHint } from '@/features/game/engine-hint';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { formatHintNotation } from '@/features/game/guidance-copy';
import {
  clearGuidance,
  showGuidance,
  useGuidance,
} from '@/features/game/guidance-store';
import { cloneGameState } from '@/lib/game/snapshot';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
  moveLogLength: number;
};

type Phase = 'idle' | 'loading' | 'error';

/**
 * "Hint" button for the human turn, available at any point in the moving
 * phase — including mid-turn after some dice are played. Asks the engine
 * (falling back to the built-in heuristic when it's unavailable) for the
 * best continuation from the CURRENT position + remaining dice, then opens
 * a hint guidance session: the suggestion draws as arrows on the board and
 * a pill offers "Back to my turn" to dismiss and keep playing. The game is
 * never paused.
 *
 * If the player moves while the request is in flight, the stale result is
 * discarded — an answer for a dead position is worse than none.
 *
 * Demo branch: strings are English-only.
 */
export function HintButton({ state, moveLogLength }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const session = useGuidance();
  const hintOpen = session?.kind === 'hint' && session.revealed;
  const requestId = useRef(0);

  // Any board change invalidates an in-flight request (stale positions
  // must never surface as guidance).
  useEffect(() => {
    requestId.current += 1;
  }, [state]);

  const ask = async () => {
    if (phase === 'loading')
      return;
    hapticLight();
    const id = ++requestId.current;
    setPhase('loading');
    // Snapshot now: the answer belongs to this exact position.
    const questionState = cloneGameState(state);
    const atRequestMoveLogLength = moveLogLength;
    try {
      const hint = await getEngineHint(state);
      if (requestId.current !== id)
        return; // the player moved on — drop the stale answer
      setPhase('idle');
      showGuidance({
        kind: 'hint',
        questionState,
        myMoves: [],
        engineMoves: hint.moves,
        revealed: true,
        showMine: false,
        showEngine: true,
        engineId: hint.engineId,
        hintMoveLogLength: atRequestMoveLogLength,
      });
    }
    catch {
      if (requestId.current !== id)
        return;
      setPhase('error');
    }
  };

  const dismiss = () => {
    hapticLight();
    requestId.current += 1;
    setPhase('idle');
    clearGuidance();
  };

  if (hintOpen && session) {
    const label = session.engineId === primaryEngine.id ? 'Suggested move' : 'Hint';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to my turn, dismiss the hint"
        testID="hint-result"
        onPress={dismiss}
        style={({ pressed }) => [styles.resultPill, pressed && styles.pressed]}
      >
        <Text style={styles.resultText} numberOfLines={2}>
          {label}
          :
          {formatHintNotation(session.engineMoves)}
        </Text>
        <Text style={styles.dismissText}>Back to my turn</Text>
      </Pressable>
    );
  }

  if (phase === 'loading') {
    return (
      <View style={styles.slot} testID="hint-loading">
        <ActivityIndicator size="small" color={GAME_PALETTE.accent} />
        <Text style={styles.loadingText}>Finding the best move…</Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry hint"
        testID="hint-button"
        onPress={ask}
        style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}
      >
        <Text style={styles.hintBtnText}>Couldn't find a hint — tap to retry</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Get a move hint"
      testID="hint-button"
      onPress={ask}
      style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}
    >
      <Text style={styles.hintBtnText}>Hint</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
  },
  loadingText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    ...interFont('medium'),
  },
  hintBtn: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.35)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: 'center',
    ...continuousRadius(12),
  },
  hintBtnText: {
    color: GAME_PALETTE.accent,
    fontSize: 16,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.85,
  },
  resultPill: {
    backgroundColor: 'rgba(232, 224, 208, 0.08)',
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
    alignItems: 'center',
    ...continuousRadius(12),
  },
  resultText: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    textAlign: 'center',
    ...interFont('semibold'),
  },
  dismissText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 10,
    marginTop: 2,
    ...interFont('regular'),
  },
});
