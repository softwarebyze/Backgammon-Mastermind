import type { GameState } from '@/lib/game/types';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useGame } from '@/features/game/use-game';
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
 * Tracks the identity of the current hint request. `begin()` starts a new
 * request and returns its id; `isCurrent(id)` tells whether that request is
 * still the latest; `invalidate()` cancels whatever is in flight. The id
 * bumps automatically whenever the board may have moved under a request:
 * - `state` — the committed game state (covers undo, take-back, passes).
 * - `isAnimating` false→true — a move INITIATION. The game state only
 *   commits when the move animation finishes, so keying off `state` alone
 *   leaves a window where the engine can answer for the pre-move position
 *   after the player has already moved. isAnimating flips synchronously
 *   when the animation starts, closing that window.
 * Stale answers are therefore dropped instead of surfacing as guidance.
 */
function useHintRequest(state: GameState) {
  const requestIdRef = useRef(0);
  const { isAnimating } = useGame();
  useEffect(() => {
    requestIdRef.current += 1;
  }, [state]);
  const wasAnimating = useRef(isAnimating);
  useEffect(() => {
    if (isAnimating && !wasAnimating.current)
      requestIdRef.current += 1;
    wasAnimating.current = isAnimating;
  }, [isAnimating]);
  const begin = useCallback(() => ++requestIdRef.current, []);
  const isCurrent = useCallback((id: number) => requestIdRef.current === id, []);
  const invalidate = useCallback(() => {
    requestIdRef.current += 1;
  }, []);
  return { begin, isCurrent, invalidate };
}

/**
 * "Hint" button for the human turn, available at TURN START only (the
 * controls hide it once a move is played). Asks the primary engine for the
 * best line from the turn-start position, then opens a hint guidance
 * session: the suggestion draws as arrows on the board and a pill offers
 * "Back to my turn" to dismiss and keep playing. The game is never paused.
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
  const hintRequest = useHintRequest(state);
  const { doMoveSequence } = useGame();

  const ask = async () => {
    if (phase === 'loading')
      return;
    hapticLight();
    const id = hintRequest.begin();
    setPhase('loading');
    // Snapshot now: the answer belongs to this exact position.
    const questionState = cloneGameState(state);
    const atRequestMoveLogLength = moveLogLength;
    try {
      const hint = await getEngineHint(state);
      if (!hintRequest.isCurrent(id))
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
      if (!hintRequest.isCurrent(id))
        return;
      setPhase('error');
    }
  };

  const dismiss = () => {
    hapticLight();
    hintRequest.invalidate();
    setPhase('idle');
    clearGuidance();
  };

  const playHintedMove = () => {
    if (!session || session.kind !== 'hint')
      return;
    const moves = session.engineMoves;
    if (moves.length === 0)
      return;
    hapticLight();
    hintRequest.invalidate();
    setPhase('idle');
    clearGuidance();
    // Play the suggested line as an animated sequence.
    doMoveSequence(moves);
  };

  if (hintOpen && session) {
    const label = session.engineId === primaryEngine.id ? 'Suggested move' : 'Hint';
    return (
      <View style={styles.resultWrap} testID="hint-result">
        <Text style={styles.resultText} numberOfLines={2}>
          {label}
          :
          {formatHintNotation(session.engineMoves)}
        </Text>
        <View style={styles.resultActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play the suggested move"
            testID="hint-play-move"
            onPress={playHintedMove}
            style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
          >
            <Text style={styles.playBtnText}>Play this move</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to my turn, dismiss the hint"
            testID="hint-dismiss"
            onPress={dismiss}
            style={({ pressed }) => [styles.dismissBtn, pressed && styles.pressed]}
          >
            <Text style={styles.dismissText}>Back to my turn</Text>
          </Pressable>
        </View>
      </View>
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
  resultWrap: {
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
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  playBtn: {
    backgroundColor: GAME_PALETTE.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    ...continuousRadius(10),
  },
  playBtnText: {
    color: GAME_PALETTE.bg,
    fontSize: 15,
    ...interFont('semibold'),
  },
  dismissBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dismissText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('medium'),
  },
});
