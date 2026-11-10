import type { TimerConfig, TimerPlayer, TimerState } from './timer-clock';

import {
  advanceClock,
  createTimerState,
  pauseClock,
  resetClock,
  resumeClock,
  setTimerConfig,
  startClock,
  switchClock,
} from './timer-clock';
import { loadTimerPreferences } from './timer-preferences';

const initialPreferences = loadTimerPreferences();

let current = createTimerState({
  initialMs: initialPreferences.initialMs,
  delayMs: initialPreferences.delayMs,
});
const listeners = new Set<() => void>();

function publish(next: TimerState): void {
  if (next === current) {
    return;
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeTimer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTimerState(): TimerState {
  return current;
}

/** Tap a clock: start it from idle, or end the running player's turn. */
export function tapTimer(player: TimerPlayer): void {
  const now = Date.now();
  if (current.status === 'idle') {
    publish(startClock(current, player, now));
    return;
  }
  if (current.status === 'running' && current.active === player) {
    publish(switchClock(current, now));
  }
}

export function pauseTimer(): void {
  publish(pauseClock(current, Date.now()));
}

export function resumeTimer(): void {
  publish(resumeClock(current, Date.now()));
}

export function resetTimer(): void {
  publish(resetClock(current));
}

export function changeTimerControl(config: TimerConfig): void {
  publish(setTimerConfig(current, config));
}

/** Called by the screen's interval; moving the anchor catches up after app pauses. */
export function advanceTimer(): void {
  publish(advanceClock(current, Date.now()));
}

/** Test-only: restore a fresh idle clock from the stored preferences. */
export function resetTimerStoreForTests(): void {
  const preferences = loadTimerPreferences();
  current = createTimerState({
    initialMs: preferences.initialMs,
    delayMs: preferences.delayMs,
  });
  listeners.clear();
}
