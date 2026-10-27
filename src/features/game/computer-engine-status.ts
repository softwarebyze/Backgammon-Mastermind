import { useSyncExternalStore } from 'react';

let fallback = false;
const listeners = new Set<() => void>();
export function setComputerEngineFallback(value: boolean): void {
  if (fallback === value)
    return;
  fallback = value;
  listeners.forEach(listener => listener());
}
export function useComputerEngineFallback(): boolean {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, () => fallback, () => false);
}
