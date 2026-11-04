import type { GameEngine } from './engine';
import type { CubeAnalysis, CubeDecision } from '@/features/game/cube-analysis';
import type { GameState } from '@/lib/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeCubeDecision } from '@/features/game/cube-analysis';
import { TUTOR_BLUNDER_THRESHOLD } from '@/features/game/tutor';

/**
 * A cube decision the player has already made, while it is checked ("checking",
 * which only pauses play) and then, if it cost enough, reviewed ("mistake").
 */
export type CubeTutorSession = {
  /** The position the decision was made in. */
  state: GameState;
  phase: 'checking' | 'mistake';
  attempted: CubeDecision;
  analysis?: CubeAnalysis;
  /** Equity given up versus the best choice, in current-cube units. */
  loss?: number;
};
type Options = {
  state: GameState | null;
  enabled: boolean;
  active: boolean;
  blocked: boolean;
  engine?: GameEngine;
};

/**
 * Tutor for cube decisions. The choice always goes through at once, so pressing
 * Roll never stops to hint that a double was right; the check runs afterwards,
 * pausing play until it answers, and only a costly choice gets a review card.
 */
export function useCubeTutor(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [session, publish] = useState<CubeTutorSession | null>(null);
  const live = useRef<CubeTutorSession | null>(null);
  const generation = useRef(0);
  const setSession = useCallback((next: CubeTutorSession | null) => {
    live.current = next;
    publish(next);
  }, []);
  const cancel = useCallback(() => {
    generation.current++;
    setSession(null);
  }, [setSession]);
  useEffect(() => () => {
    generation.current++;
  }, []);
  // A new game, a reset or leaving the game drops any review in flight.
  useEffect(() => {
    if (live.current && !options.active)
      cancel();
  }, [options.active, cancel]);

  const run = useCallback(async (state: GameState, attempted: CubeDecision, commit: () => void) => {
    if (!latest.current.active || latest.current.blocked || latest.current.state !== state || live.current)
      return;
    if (!latest.current.enabled) {
      commit();
      return;
    }
    const id = ++generation.current;
    setSession({ state, attempted, phase: 'checking' });
    commit();
    try {
      const analysis = await analyzeCubeDecision(state, latest.current.engine);
      if (generation.current !== id)
        return;
      const best = analysis.values[analysis.best];
      const chosen = analysis.values[attempted];
      if (best === undefined || chosen === undefined)
        throw new Error('No evaluation for this cube action');
      const loss = best - chosen;
      setSession(loss >= TUTOR_BLUNDER_THRESHOLD ? { state, attempted, analysis, loss, phase: 'mistake' } : null);
    }
    catch {
      // The choice already stands; an unavailable check must not hold the game.
      if (generation.current === id)
        setSession(null);
    }
  }, [setSession]);
  return { session, run, dismiss: cancel };
}
