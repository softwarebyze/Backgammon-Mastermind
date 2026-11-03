import type { GameEngine } from './engine';
import type { CubeAnalysis, CubeDecision } from '@/features/game/cube-analysis';
import type { GameState } from '@/lib/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeCubeDecision } from '@/features/game/cube-analysis';
import { TUTOR_BLUNDER_THRESHOLD } from '@/features/game/tutor';

export type CubeTutorSession = {
  state: GameState;
  phase: 'checking' | 'mistake' | 'error';
  attempted: CubeDecision;
  analysis?: CubeAnalysis;
  revealed: boolean;
};
type Options = {
  state: GameState | null;
  enabled: boolean;
  active: boolean;
  blocked: boolean;
  engine?: GameEngine;
};

/** Checks before committing, so a missed double or bad take never races the next roll. */
export function useCubeTutor(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [session, publish] = useState<CubeTutorSession | null>(null);
  const live = useRef<CubeTutorSession | null>(null);
  const continuation = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const setSession = useCallback((next: CubeTutorSession | null) => {
    live.current = next;
    publish(next);
  }, []);
  const cancel = useCallback(() => {
    generation.current++;
    continuation.current = null;
    setSession(null);
  }, [setSession]);
  useEffect(() => () => {
    generation.current++;
  }, []);
  useEffect(() => {
    if (live.current && (!options.active || options.state !== live.current.state))
      cancel();
  }, [options.active, options.state, cancel]);
  const isCurrent = useCallback((state: GameState, id: number) => generation.current === id
    && latest.current.state === state && latest.current.active && !latest.current.blocked, []);

  const run = useCallback(async (state: GameState, attempted: CubeDecision, commit: () => void) => {
    if (!latest.current.active || latest.current.blocked || latest.current.state !== state || live.current)
      return;
    if (!latest.current.enabled) {
      commit();
      return;
    }
    const id = ++generation.current;
    continuation.current = commit;
    setSession({ state, attempted, phase: 'checking', revealed: false });
    try {
      const analysis = await analyzeCubeDecision(state, latest.current.engine);
      if (!isCurrent(state, id))
        return;
      const best = analysis.values[analysis.best];
      const chosen = analysis.values[attempted];
      if (best === undefined || chosen === undefined)
        throw new Error('No evaluation for this cube action');
      if (best - chosen >= TUTOR_BLUNDER_THRESHOLD) {
        setSession({ state, attempted, analysis, phase: 'mistake', revealed: false });
      }
      else {
        continuation.current = null;
        setSession(null);
        commit();
      }
    }
    catch {
      if (isCurrent(state, id))
        setSession({ state, attempted, phase: 'error', revealed: false });
    }
  }, [setSession, isCurrent]);
  const proceed = useCallback(() => {
    const current = live.current;
    const commit = continuation.current;
    if (!current || current.phase === 'checking' || !commit
      || !isCurrent(current.state, generation.current)) {
      return;
    }
    cancel();
    commit();
  }, [cancel, isCurrent]);
  const reveal = useCallback(() => {
    if (live.current)
      setSession({ ...live.current, revealed: true });
  }, [setSession]);
  const retry = useCallback(() => {
    const current = live.current;
    const commit = continuation.current;
    if (!current || !commit)
      return;
    cancel();
    void run(current.state, current.attempted, commit);
  }, [cancel, run]);
  return { session: session?.state === options.state ? session : null, run, cancel, proceed, reveal, retry };
}
