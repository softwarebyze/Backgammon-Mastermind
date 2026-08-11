/**
 * GNU Backgammon engine bridge — Expo web (WASM via vendored gnubg-core).
 */
import type { GameState, Move } from './types';

import { resolveGnuPlay } from './gnu-play';
import { getLegalMoves } from './moves';
import { toXgid } from './xgid';

export type GnuHintMove = {
  move: string;
  equity: number[];
  eval: number[];
};

export type GnuEngineStatus = 'unavailable' | 'loading' | 'ready' | 'error';

type GnuCore = {
  hint: (xgid: string, depth: number) => {
    action: string;
    data?: GnuHintMove[] | Record<string, unknown>;
  } | null;
  shutdown: () => void;
};

const DEFAULT_DEPTH = 1;

let status: GnuEngineStatus = 'unavailable';
let core: GnuCore | null = null;
let loadPromise: Promise<boolean> | null = null;

/** Remaining single-die moves from the last GNU full-turn hint. */
let queue: Move[] = [];
/** Player + dice for the queued turn. */
let queueTurnId: string | null = null;

function turnId(state: GameState): string {
  return `${state.currentPlayer}:${state.dice[0]}x${state.dice[1]}`;
}

function isTurnStart(state: GameState): boolean {
  const [a, b] = state.dice;
  if (a < 1 || b < 1)
    return false;
  if (a === b)
    return state.remainingDice.length === 4;
  return state.remainingDice.length === 2
    && state.remainingDice.includes(a)
    && state.remainingDice.includes(b);
}

function isLegalInState(state: GameState, move: Move): boolean {
  return getLegalMoves(state).some(
    m => m.from === move.from && m.to === move.to,
  );
}

export function getGnuEngineStatus(): GnuEngineStatus {
  return status;
}

export function isGnuEngineReady(): boolean {
  return status === 'ready' && core !== null;
}

export function clearGnuMoveQueue(): void {
  queue = [];
  queueTurnId = null;
}

async function loadCore(): Promise<boolean> {
  if (core && status === 'ready')
    return true;
  if (typeof window === 'undefined') {
    status = 'unavailable';
    return false;
  }

  status = 'loading';
  try {
    const href = new URL('/gnubg/gnubg-core.js', window.location.origin).href;
    // Public static ESM — bypass the Metro bundler.
    const mod = await import(/* webpackIgnore: true */ href) as {
      initGnubgCore: () => Promise<GnuCore>;
    };
    core = await mod.initGnubgCore();
    status = 'ready';
    return true;
  }
  catch (error) {
    console.warn('[gnu-engine] failed to load WASM', error);
    status = 'error';
    core = null;
    return false;
  }
}

export async function preloadGnuEngine(): Promise<boolean> {
  if (!loadPromise)
    loadPromise = loadCore();
  return loadPromise;
}

function takeQueuedMove(state: GameState): Move | null {
  if (queue.length === 0 || queueTurnId === null)
    return null;
  if (queueTurnId !== turnId(state)) {
    clearGnuMoveQueue();
    return null;
  }
  const next = queue[0]!;
  if (!isLegalInState(state, next)) {
    clearGnuMoveQueue();
    return null;
  }
  queue.shift();
  if (queue.length === 0)
    queueTurnId = null;
  return next;
}

export async function getGnuMove(state: GameState): Promise<Move | null> {
  if (state.phase !== 'moving')
    return null;

  const queued = takeQueuedMove(state);
  if (queued)
    return queued;

  const ready = await preloadGnuEngine();
  if (!ready || !core)
    return null;

  // Only ask GNU at the start of a turn (full dice still available).
  if (!isTurnStart(state))
    return null;

  const xgid = toXgid(state);
  let hint: ReturnType<GnuCore['hint']> = null;
  try {
    hint = core.hint(xgid, DEFAULT_DEPTH);
  }
  catch (error) {
    console.warn('[gnu-engine] hint failed', error);
    return null;
  }

  if (!hint || hint.action !== 'play' || !Array.isArray(hint.data) || hint.data.length === 0)
    return null;

  const best = hint.data[0] as GnuHintMove;
  const sequence = resolveGnuPlay(state, best.move);
  if (!sequence || sequence.length === 0) {
    console.warn('[gnu-engine] could not map play', best.move, xgid);
    return null;
  }

  queue = sequence.slice(1);
  queueTurnId = turnId(state);
  return sequence[0] ?? null;
}
