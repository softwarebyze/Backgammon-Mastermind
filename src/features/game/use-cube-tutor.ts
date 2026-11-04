import type { GameEngine } from './engine';
import type { CubeAnalysis, CubeDecision } from '@/features/game/cube-analysis';
import type { GameState } from '@/lib/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeCubeDecision } from '@/features/game/cube-analysis';
import { TUTOR_BLUNDER_THRESHOLD } from '@/features/game/tutor';

/**
 * A cube decision being checked ("checking", which only pauses play) and then,
 * if it cost enough, reviewed ("mistake"). A roll has already happened; any
 * other decision waits here, not yet applied, until the player keeps it or
 * takes it back.
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
 * Tutor for cube decisions. Rolling goes through at once, so pressing Roll
 * never stops to hint that a double was right. A double, take, pass or beaver
 * waits for the check instead: a sound one then goes through by itself, and a
 * costly one gets a review card that can take it back, so a mistake can be
 * fixed even where cube decisions are binding (matches) and before the
 * computer answers it.
 */
export function useCubeTutor(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [session, publish] = useState<CubeTutorSession | null>(null);
  const live = useRef<CubeTutorSession | null>(null);
  const generation = useRef(0);
  /** Applies the decision under review; null once applied or taken back. */
  const pendingCommit = useRef<(() => void) | null>(null);
  const setSession = useCallback((next: CubeTutorSession | null) => {
    live.current = next;
    publish(next);
  }, []);
  const cancel = useCallback(() => {
    generation.current++;
    pendingCommit.current = null;
    setSession(null);
  }, [setSession]);
  /** Apply the decision as made (a roll was applied already). */
  const keep = useCallback(() => {
    const commit = pendingCommit.current;
    cancel();
    commit?.();
  }, [cancel]);
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
    if (attempted === 'roll')
      commit();
    else
      pendingCommit.current = commit;
    try {
      const analysis = await analyzeCubeDecision(state, latest.current.engine);
      if (generation.current !== id)
        return;
      const best = analysis.values[analysis.best];
      const chosen = analysis.values[attempted];
      if (best === undefined || chosen === undefined)
        throw new Error('No evaluation for this cube action');
      const loss = best - chosen;
      if (loss >= TUTOR_BLUNDER_THRESHOLD)
        setSession({ state, attempted, analysis, loss, phase: 'mistake' });
      else
        keep();
    }
    catch {
      // An unavailable check must not hold the game: the choice goes through.
      if (generation.current === id)
        keep();
    }
  }, [keep, setSession]);
  return { session, run, keep, takeBack: cancel, dismiss: cancel };
}
