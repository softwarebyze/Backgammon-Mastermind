import type { GameEngine } from './types';
import { bgsageEngine } from './bgsage-engine';

export type { GameEngine } from './types';

/**
 * ENGINE SWAP POINT — the one place that chooses the engine behind the
 * tutor and the hints. Everything downstream (tutor verdicts, hint arrows,
 * guidance UI) only talks to the `GameEngine` interface and never names an
 * engine, so swapping engines means implementing `GameEngine` (see
 * `./types.ts`) and repointing `primaryEngine` here. Nothing else changes.
 *
 * There is no fallback engine. If this one cannot answer, the hint button
 * offers nothing and the tutor stays silent.
 */
export const primaryEngine: GameEngine = bgsageEngine;
