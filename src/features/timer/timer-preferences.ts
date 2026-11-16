import { useCallback, useSyncExternalStore } from 'react';

import { getItem, setItem } from '@/lib/storage';

export type TimerPreferences = {
  initialMs: number;
  delayMs: number;
  soundEnabled: boolean;
  facePlayers: boolean;
};

const STORAGE_KEY = 'TIMER_PREFERENCES';

/** Casual controls plus 10/14/18-minute banks for 5/7/9-point matches. */
export const TIMER_TIME_PRESETS = [
  60_000,
  180_000,
  300_000,
  600_000,
  840_000,
  1_080_000,
  1_800_000,
] as const;

/** BHB-style Bronstein delay. 12 seconds is the classic backgammon setting. */
export const TIMER_DELAY_PRESETS = [0, 3_000, 5_000, 10_000, 12_000, 15_000] as const;

export const DEFAULT_TIMER_PREFERENCES: TimerPreferences = {
  initialMs: 600_000,
  delayMs: 12_000,
  soundEnabled: true,
  facePlayers: false,
};

/** Accept only supported controls when restoring persisted preferences. */
function isPreset(value: number, presets: readonly number[]): boolean {
  return presets.includes(value);
}

/** Replace corrupt or unsupported saved fields with safe defaults while preserving valid settings. */
function sanitize(value: Partial<TimerPreferences> | null): TimerPreferences {
  const initialMs = value?.initialMs;
  const delayMs = value?.delayMs;
  return {
    initialMs: typeof initialMs === 'number' && isPreset(initialMs, TIMER_TIME_PRESETS)
      ? initialMs
      : DEFAULT_TIMER_PREFERENCES.initialMs,
    delayMs: typeof delayMs === 'number' && isPreset(delayMs, TIMER_DELAY_PRESETS)
      ? delayMs
      : DEFAULT_TIMER_PREFERENCES.delayMs,
    soundEnabled: typeof value?.soundEnabled === 'boolean'
      ? value.soundEnabled
      : DEFAULT_TIMER_PREFERENCES.soundEnabled,
    facePlayers: typeof value?.facePlayers === 'boolean'
      ? value.facePlayers
      : DEFAULT_TIMER_PREFERENCES.facePlayers,
  };
}

/** Restore and validate the persisted control, sound and orientation settings. */
export function loadTimerPreferences(): TimerPreferences {
  return sanitize(getItem<Partial<TimerPreferences>>(STORAGE_KEY));
}

/** Persist preference changes without blocking clock input. */
function saveTimerPreferences(preferences: TimerPreferences): void {
  void setItem(STORAGE_KEY, preferences);
}

let cached = loadTimerPreferences();
const listeners = new Set<() => void>();

/** Notify mounted preference consumers after a cached setting changes. */
function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/** Register a preference consumer and return its unsubscribe callback. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Return the stable cached preferences required by useSyncExternalStore. */
function getSnapshot(): TimerPreferences {
  return cached;
}

/** Validate a partial change, persist and notify only when a setting actually differs. */
function patchTimerPreferences(patch: Partial<TimerPreferences>): void {
  const next = sanitize({ ...cached, ...patch });
  if (
    next.initialMs === cached.initialMs
    && next.delayMs === cached.delayMs
    && next.soundEnabled === cached.soundEnabled
    && next.facePlayers === cached.facePlayers
  ) {
    return;
  }
  cached = next;
  saveTimerPreferences(cached);
  emitChange();
}

/** Subscribe to saved settings and expose stable callbacks for changing controls and toggles. */
export function useTimerPreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setInitialMs = useCallback((initialMs: number) => {
    patchTimerPreferences({ initialMs });
  }, []);
  const setDelayMs = useCallback((delayMs: number) => {
    patchTimerPreferences({ delayMs });
  }, []);
  const toggleSound = useCallback(() => {
    patchTimerPreferences({ soundEnabled: !cached.soundEnabled });
  }, []);
  const toggleFacePlayers = useCallback(() => {
    patchTimerPreferences({ facePlayers: !cached.facePlayers });
  }, []);
  return { preferences, setInitialMs, setDelayMs, toggleSound, toggleFacePlayers };
}
