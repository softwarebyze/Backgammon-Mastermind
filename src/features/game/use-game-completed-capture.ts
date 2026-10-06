import type { GameState } from '@/lib/game';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Fires `game_completed` once per game, from the game provider (always
 * mounted) rather than from a screen effect. Only a live move that ends the
 * game arms the capture, so resuming a finished game for review or redoing
 * the winning move never counts as another completion.
 */
export function useGameCompletedCapture(state: GameState | null, moveCount: number) {
  const posthog = usePostHog();
  const armedRef = useRef(false);

  const noteMoveApplied = useCallback((before: GameState, after: GameState) => {
    if (before.phase !== 'game-over' && after.phase === 'game-over') {
      armedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (state?.phase !== 'game-over') {
      armedRef.current = false;
      return;
    }
    if (!armedRef.current) {
      return;
    }
    armedRef.current = false;
    posthog.capture('game_completed', {
      mode: state.mode,
      winner: state.winner,
      move_count: moveCount,
    });
  }, [posthog, state, moveCount]);

  return noteMoveApplied;
}
