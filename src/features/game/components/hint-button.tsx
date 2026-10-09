import type { GuidanceSession } from '@/features/game/guidance-store';

import type { GameState } from '@/lib/game/types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { translate } from '@/lib/i18n';
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
  useEffect(() => () => {
    // A slow engine result must not open guidance after leaving this screen.
    requestIdRef.current += 1;
  }, []);
  const begin = useCallback(() => ++requestIdRef.current, []);
  const isCurrent = useCallback((id: number) => requestIdRef.current === id, []);
  const invalidate = useCallback(() => {
    requestIdRef.current += 1;
  }, []);
  return { begin, isCurrent, invalidate };
}

/**
 * The revealed-hint card: the suggested move plus "Play this move" and
 * "Back to my turn" actions.
 */
function HintResult({ session, onPlay, onDismiss }: {
  session: GuidanceSession;
  onPlay: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.resultWrap} testID="hint-result">
      <Text style={styles.resultLine} numberOfLines={1}>
        <Text style={styles.resultLabel}>{translate('game.hint.suggested')}</Text>
        {'  '}
        <Text style={styles.resultText}>{formatHintNotation(session.engineMoves)}</Text>
      </Text>
      <View style={styles.resultActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translate('game.hint.play_a11y')}
          testID="hint-play-move"
          onPress={onPlay}
          style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
        >
          <Text style={styles.playBtnText}>{translate('game.hint.play')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translate('game.hint.back_to_turn_a11y')}
          testID="hint-dismiss"
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismissBtn, pressed && styles.pressed]}
        >
          <Text style={styles.dismissText}>{translate('game.hint.back_to_turn')}</Text>
        </Pressable>
      </View>
    </View>
  );
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
    // Dismiss the hint UI first, then play the moves on the next frame so
    // the board has settled and the animation runs cleanly.
    requestAnimationFrame(() => {
      doMoveSequence(moves);
    });
  };

  if (hintOpen && session && session.kind === 'hint') {
    return (
      <HintResult
        session={session}
        onPlay={playHintedMove}
        onDismiss={dismiss}
      />
    );
  }

  if (phase === 'loading') {
    return (
      <View style={styles.slot} testID="hint-loading">
        <ActivityIndicator size="small" color={GAME_PALETTE.accent} />
        <Text style={styles.loadingText}>{translate('game.hint.finding')}</Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.hint.error_a11y')}
        testID="hint-button"
        onPress={ask}
        style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}
      >
        <Text style={styles.hintBtnText}>{translate('game.hint.error')}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.hint.button_a11y')}
      testID="hint-button"
      onPress={ask}
      style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}
    >
      <Text style={styles.hintBtnText}>{translate('game.hint.button')}</Text>
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
  // Overlays the action slot and the caption under it instead of growing the
  // controls: taller controls shrink the board slot, so the board would
  // resize every time the hint opens or closes.
  resultWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    ...continuousRadius(12),
  },
  resultLine: {
    textAlign: 'center',
  },
  resultLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('medium'),
  },
  resultText: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('semibold'),
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  playBtn: {
    backgroundColor: GAME_PALETTE.accent,
    paddingHorizontal: 18,
    paddingVertical: 7,
    ...continuousRadius(10),
  },
  playBtnText: {
    color: GAME_PALETTE.bg,
    fontSize: 15,
    ...interFont('semibold'),
  },
  dismissBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dismissText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('medium'),
  },
});
