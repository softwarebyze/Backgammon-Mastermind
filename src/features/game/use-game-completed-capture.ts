import type { GameState } from '@/lib/game';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { settingProperties } from '@/lib/analytics/settings-analytics';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';

/** Why an unfinished game ended without reaching game-over. */
export type GameAbandonReason = 'new_game' | 'reset';

/**
 * Fires `game_completed` once per game, from the game provider (always
 * mounted) rather than from a screen effect. Only a live move that ends the
 * game arms the capture, so resuming a finished game for review or redoing
 * the winning move never counts as another completion. A game counts once:
 * undoing out of game-over and winning again is the same game, so the guard
 * only resets when `resetForNewGame` is called.
 *
 * `resetForNewGame` also fires `game_abandoned` when the game it replaces
 * had moves and never completed, so every played game ends in exactly one of
 * `game_completed` or `game_abandoned` (or is still saved and resumable). A
 * completed game that was undone out of game-over already counted as
 * completed, so replacing it is not an abandon. A game with no moves was
 * never played, so replacing it reports nothing.
 */
export function useGameCompletedCapture(state: GameState | null, moveCount: number) {
  const posthog = usePostHog();
  const { preferences } = useGamePreferences();
  const armedRef = useRef(false);
  const completedRef = useRef(state?.phase === 'game-over');
  const latestRef = useRef({ state, moveCount });
  latestRef.current = { state, moveCount };

  const noteMoveApplied = useCallback((before: GameState, after: GameState) => {
    if (!completedRef.current && before.phase !== 'game-over' && after.phase === 'game-over') {
      armedRef.current = true;
    }
  }, []);

  const resetForNewGame = useCallback((reason: GameAbandonReason) => {
    const { state: previous, moveCount: previousMoveCount } = latestRef.current;
    if (
      previous
      && previous.phase !== 'game-over'
      && !completedRef.current
      && previousMoveCount > 0
    ) {
      // Optional: provider hooks also run in tests without a PostHogProvider.
      posthog?.capture('game_abandoned', {
        mode: previous.mode,
        phase: previous.phase,
        move_count: previousMoveCount,
        reason,
      });
    }
    armedRef.current = false;
    completedRef.current = false;
  }, [posthog]);

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
