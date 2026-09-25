import type { GameEngine } from './types';
import { bgsageEngine } from './bgsage-engine';
import { heuristicEngine } from './heuristic-engine';

export type { GameEngine } from './types';

/**
 * ENGINE SWAP POINT — the one place that chooses the engine behind the
 * tutor and the hints. Everything downstream (tutor verdicts, hint arrows,
 * guidance UI) only talks to the `GameEngine` interface and never names an
 * engine, so swapping engines means implementing `GameEngine` (see
 * `./types.ts`) and repointing `primaryEngine` here. Nothing else changes.
 */
export const primaryEngine: GameEngine = bgsageEngine;

/**
 * Used when the primary engine is unavailable (Expo Go, WASM not loaded
 * yet). Hints fall back to it; the tutor stays silent instead — a guessy
 * blunder verdict is worse than none.
 */
export const fallbackEngine: GameEngine = heuristicEngine;
