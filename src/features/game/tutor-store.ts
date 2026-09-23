import { useSyncExternalStore } from 'react';

export type TutorNotice = {
  id: number;
  /** e.g. "Big blunder!" */
  title: string;
  /** e.g. "Sage preferred 13/11 · 8/5 (−0.12)." */
  body: string;
};

let notice: TutorNotice | null = null;
let nextId = 1;
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

function getSnapshot(): TutorNotice | null {
  return notice;
}

export function showTutorNotice(n: Omit<TutorNotice, 'id'>) {
  notice = { ...n, id: nextId++ };
  emit();
}

export function clearTutorNotice() {
  if (notice === null)
    return;
  notice = null;
  emit();
}

export function useTutorNotice(): TutorNotice | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
