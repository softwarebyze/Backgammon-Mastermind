import type { DiceDisplayStyle, GamePreferences } from './types';

import { useCallback, useSyncExternalStore } from 'react';

import { trackSettingsChange, trackSettingsReset } from '@/lib/analytics/settings-analytics';

import { loadGamePreferences, saveGamePreferences } from './storage';
import { DEFAULT_GAME_PREFERENCES } from './types';

let cached = loadGamePreferences();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): GamePreferences {
  return cached;
}

function updatePreferences(patch: Partial<GamePreferences>) {
  const previous = cached;
  cached = { ...cached, ...patch };
  saveGamePreferences(cached);
  emitChange();
  trackSettingsChange(previous, cached);
}

/** Patch prefs outside of React (e.g. learn graduation → beginner aids). */
export function patchGamePreferences(patch: Partial<GamePreferences>) {
  updatePreferences(patch);
}

/**
 * Restore the game preference defaults only. Language, saved games, learn
 * progress, analytics consent, and migration markers live under separate
 * storage keys and must survive this reset.
 */
export function resetGamePreferences() {
  const previous = cached;
  cached = { ...DEFAULT_GAME_PREFERENCES };
  saveGamePreferences(cached);
  emitChange();
  trackSettingsChange(previous, cached);
  trackSettingsReset(previous, cached);
}

export function useGamePreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setShowMoveHints = useCallback((showMoveHints: boolean) => {
    updatePreferences({ showMoveHints });
  }, []);

  const setShowDirectionOverlay = useCallback((showDirectionOverlay: boolean) => {
    updatePreferences({ showDirectionOverlay });
  }, []);

  const setShowPointNumbers = useCallback((showPointNumbers: boolean) => {
    updatePreferences({ showPointNumbers });
  }, []);

  const setDiceDisplayStyle = useCallback((diceDisplayStyle: DiceDisplayStyle) => {
    updatePreferences({ diceDisplayStyle });
  }, []);

  const setAutoRoll = useCallback((autoRoll: boolean) => {
    updatePreferences({ autoRoll });
  }, []);

  const setAutoMoveWhenForced = useCallback((autoMoveWhenForced: boolean) => {
    updatePreferences({ autoMoveWhenForced });
  }, []);

  const setSoundEnabled = useCallback((soundEnabled: boolean) => {
    updatePreferences({ soundEnabled });
  }, []);

  const setTutorMode = useCallback((tutorMode: boolean) => {
    updatePreferences({ tutorMode });
  }, []);

  const setConfirmMove = useCallback((confirmMove: boolean) => {
    updatePreferences({ confirmMove });
  }, []);

  const resetPreferences = useCallback(() => {
    resetGamePreferences();
  }, []);

  return {
    preferences,
    resetPreferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setShowPointNumbers,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
    setSoundEnabled,
    setTutorMode,
    setConfirmMove,
  };
}
