import type { GameState } from '@/lib/game/types';

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hintMovesToSegments } from '@/features/game/hint-arrows';
import { clearHintArrows, setHintArrows } from '@/features/game/hint-arrows-store';
import { getSageHint } from '@/features/game/sage-hint';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
};

type Phase = 'idle' | 'loading' | 'done' | 'error';

/**
 * "Hint" button for the human turn. Asks the Sage engine for the best turn
 * and draws the suggested moves as arrows on the board, with the compact
 * notation (e.g. "13/11 · 8/5") in the action slot. Falls back to the
 * built-in heuristic AI when the native/WASM engine isn't available.
 *
 * Demo branch: strings are English-only.
 */
export function SageHintButton({ state }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [notation, setNotation] = useState<string | null>(null);
  const [engine, setEngine] = useState<'sage' | 'heuristic' | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const requestId = useRef(0);

  // A new roll / turn invalidates the previous suggestion.
  const turnKey = `${state.currentPlayer}|${state.dice[0]},${state.dice[1]}|${state.remainingDice.join(',')}`;
  useEffect(() => {
    requestId.current += 1;
    setPhase('idle');
    setNotation(null);
    setEngine(null);
    setMs(null);
    clearHintArrows();
  }, [turnKey]);

  // Never leave stale arrows on the board (e.g. button unmounts when the
  // player selects a checker or makes a move).
  useEffect(() => () => clearHintArrows(), []);

  const ask = async () => {
    if (phase === 'loading')
      return;
    hapticLight();
    const id = ++requestId.current;
    setPhase('loading');
    try {
      const hint = await getSageHint(state);
      if (requestId.current !== id)
        return; // turn changed mid-flight
      setNotation(hint.notation);
      setEngine(hint.engine);
      setMs(hint.ms);
      setPhase('done');
      setHintArrows(hintMovesToSegments(hint.moves, state));
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
    setNotation(null);
    clearHintArrows();
  };

  if (phase === 'loading') {
    return (
      <View style={styles.slot} testID="sage-hint-loading">
        <ActivityIndicator size="small" color={GAME_PALETTE.accent} />
        <Text style={styles.loadingText}>Consulting Sage…</Text>
      </View>
    );
  }

  if (phase === 'done' && notation) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss Sage hint"
        testID="sage-hint-result"
        onPress={dismiss}
        style={({ pressed }) => [styles.resultPill, pressed && styles.pressed]}
      >
        <Text style={styles.resultText} numberOfLines={2}>
          {engine === 'sage' ? 'Sage suggests' : 'Hint'}
          :
          {notation}
          {ms !== null ? ` (${ms}ms)` : ''}
        </Text>
        <Text style={styles.dismissText}>tap to dismiss</Text>
      </Pressable>
    );
  }

  if (phase === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry Sage hint"
        testID="sage-hint-button"
        onPress={ask}
        style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}
      >
        <Text style={styles.hintBtnText}>Couldn't reach Sage — tap to retry</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Get a move hint"
      testID="sage-hint-button"
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
