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

export function useGamePreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setShowMoveHints = useCallback((showMoveHints: boolean) => {
    updatePreferences({ showMoveHints });
  }, []);

  const setShowDirectionOverlay = useCallback((showDirectionOverlay: boolean) => {
    updatePreferences({ showDirectionOverlay });
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

  return {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
  };
}
