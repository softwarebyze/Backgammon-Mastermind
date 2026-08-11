/**
 * GNU Backgammon engine bridge — native stub.
 * Strong AI (WASM) is web-only; native falls back to the heuristic searcher.
 */
import type { GameState, Move } from './types';

export type GnuHintMove = {
  move: string;
  equity: number[];
  eval: number[];
};

export type GnuEngineStatus = 'unavailable' | 'loading' | 'ready' | 'error';

export function getGnuEngineStatus(): GnuEngineStatus {
  return 'unavailable';
}

export function isGnuEngineReady(): boolean {
  return false;
}

/** No-op on native. */
export async function preloadGnuEngine(): Promise<boolean> {
  return false;
}

/**
 * Prefer GNU when ready; otherwise null (caller should use heuristic `getAIMove`).
 */
export async function getGnuMove(_state: GameState): Promise<Move | null> {
  return null;
}

/** Clear any queued multi-ply GNU turn (native: no-op). */
export function clearGnuMoveQueue(): void {}
