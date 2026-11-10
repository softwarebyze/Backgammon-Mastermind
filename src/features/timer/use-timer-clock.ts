import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { TIMER_LOW_MS } from './timer-clock';
import { useTimerPreferences } from './timer-preferences';
import { ensureTimerSfxReady, playTimerSfx } from './timer-sfx';
import {
  advanceTimer,
  getTimerState,
  pauseTimer,
  resetTimer,
  resumeTimer,
  subscribeTimer,
  tapTimer,
} from './timer-store';

/**
 * Live clock snapshot. The interval only ticks while running; each tick
 * re-anchors against wall-clock time, so a backgrounded app catches up when
 * it comes back instead of silently losing the elapsed minutes.
 */
export function useTimerClock() {
  useKeepAwake('over-the-board-clock');
  const clock = useSyncExternalStore(subscribeTimer, getTimerState, getTimerState);
  const timerPreferences = useTimerPreferences();
  const lastSecond = useRef<number | null>(null);
  const wasExpired = useRef(false);

  useEffect(() => {
    advanceTimer();
  }, []);

  useEffect(() => {
    if (clock.status !== 'running') {
      return;
    }
    const interval = setInterval(advanceTimer, 100);
    return () => clearInterval(interval);
  }, [clock.status]);

  useEffect(() => {
    if (timerPreferences.preferences.soundEnabled) {
      ensureTimerSfxReady();
    }
  }, [timerPreferences.preferences.soundEnabled]);

  useEffect(() => {
    if (!timerPreferences.preferences.soundEnabled) {
      wasExpired.current = clock.status === 'expired';
      return;
    }
    if (clock.status === 'expired') {
      if (!wasExpired.current) {
        playTimerSfx('timeout');
      }
      wasExpired.current = true;
      return;
    }
    wasExpired.current = false;
    if (clock.status !== 'running' || clock.active === null) {
      return;
    }
    const remaining = clock.remainingMs[clock.active];
    const second = Math.ceil(remaining / 1000);
    if (remaining > 0 && remaining <= TIMER_LOW_MS && second !== lastSecond.current) {
      playTimerSfx('warn');
    }
    lastSecond.current = second;
  }, [clock, timerPreferences.preferences.soundEnabled]);

  return {
    clock,
    ...timerPreferences,
    tapTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}
