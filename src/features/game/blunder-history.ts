import { useSyncExternalStore } from 'react';

/**
 * Checker plays the tutor flagged and the player kept, so the timeline can
 * mark them. Keyed by the turn's first ply (move log index + 1); the value is
 * the equity the play gave up. One game at a time: New Game clears it.
 */
let losses: ReadonlyMap<number, number> = new Map();
const listeners = new Set<() => void>();

function publish(next: Map<number, number>) {
  losses = next;
  listeners.forEach(listener => listener());
}

/** Record a judged turn, or clear it when the replayed turn was fine. */
export function recordTurnLoss(startPly: number, loss: number | null): void {
  if (loss === null && !losses.has(startPly))
    return;
  if (loss !== null && losses.get(startPly) === loss)
    return;
  const next = new Map(losses);
  if (loss === null)
    next.delete(startPly);
  else
    next.set(startPly, loss);
  publish(next);
}

/** Undo took these turns back: they are no longer part of the game. */
export function forgetTurnsAfter(moveLogLength: number): void {
  if (![...losses.keys()].some(ply => ply > moveLogLength))
    return;
  publish(new Map([...losses].filter(([ply]) => ply <= moveLogLength)));
}

export function clearBlunderHistory(): void {
  if (losses.size > 0)
    publish(new Map());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => losses;

export function useBlunderHistory(): ReadonlyMap<number, number> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
