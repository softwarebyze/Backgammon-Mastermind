import type { PathSegment } from './components/board/move-path-overlay';

import { useSyncExternalStore } from 'react';

let segments: PathSegment[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PathSegment[] {
  return segments;
}

/** Show the hint's suggested turn as arrows on the board. */
export function setHintArrows(next: PathSegment[]) {
  segments = next;
  emit();
}

/** Clear hint arrows (dismissed, turn changed, or a move was made). */
export function clearHintArrows() {
  if (segments.length === 0)
    return;
  segments = [];
  emit();
}

export function useHintArrows(): PathSegment[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
