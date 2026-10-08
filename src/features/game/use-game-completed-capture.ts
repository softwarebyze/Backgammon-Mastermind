import type { GameState } from '@/lib/game';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { settingProperties } from '@/lib/analytics/settings-analytics';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';

/**
 * Fires `game_completed` once per game, from the game provider (always
 * mounted) rather than from a screen effect. Only a live move that ends the
 * game arms the capture, so resuming a finished game for review or redoing
 * the winning move never counts as another completion. A game counts once:
 * undoing out of game-over and winning again is the same game, so the guard
 * only resets when `resetForNewGame` is called.
 */
export function useGameCompletedCapture(state: GameState | null, moveCount: number) {
  const posthog = usePostHog();
  const { preferences } = useGamePreferences();
  const armedRef = useRef(false);
  const completedRef = useRef(state?.phase === 'game-over');

  const noteMoveApplied = useCallback((before: GameState, after: GameState) => {
    if (!completedRef.current && before.phase !== 'game-over' && after.phase === 'game-over') {
      armedRef.current = true;
    }
  }, []);

  const resetForNewGame = useCallback(() => {
    armedRef.current = false;
    completedRef.current = false;
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
    completedRef.current = true;
    posthog.capture('game_completed', {
      mode: state.mode,
      winner: state.winner,
      move_count: moveCount,
      ...settingProperties(preferences),
    });
  }, [posthog, state, moveCount, preferences]);

  return { noteMoveApplied, resetForNewGame };
}
