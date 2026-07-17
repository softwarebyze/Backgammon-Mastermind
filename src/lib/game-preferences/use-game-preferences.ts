import type { DiceDisplayStyle, GamePreferences } from './types';

import { useCallback, useSyncExternalStore } from 'react';
import { loadGamePreferences, saveGamePreferences } from './storage';

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
  cached = { ...cached, ...patch };
  saveGamePreferences(cached);
  emitChange();
}

/** Patch prefs outside of React (e.g. learn graduation → beginner aids). */
export function patchGamePreferences(patch: Partial<GamePreferences>) {
  updatePreferences(patch);
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

  return {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setShowPointNumbers,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
    setSoundEnabled,
  };
}
