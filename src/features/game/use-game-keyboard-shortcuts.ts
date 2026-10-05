import type { GameState } from '@/lib/game';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';

type Actions = {
  state: GameState | null;
  isReviewing: boolean;
  tutorPaused: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onRoll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCancelSelection: () => void;
};

/** Which shortcut a keydown maps to, or null. Pure, so it's unit-testable. */
export function shortcutFor(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): 'roll' | 'undo' | 'redo' | 'cancel' | null {
  if (e.altKey) {
    return null;
  }
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (mod && key === 'z') {
    return e.shiftKey ? 'redo' : 'undo';
  }
  if (mod) {
    return null;
  }
  if (key === 'r' || key === ' ' || key === 'enter') {
    return 'roll';
  }
  if (key === 'z') {
    return 'undo';
  }
  if (key === 'y') {
    return 'redo';
  }
  if (key === 'escape') {
    return 'cancel';
  }
  return null;
}

/** Space/Enter already activate a focused button. Don't also roll. */
export function rollBlockedByFocus(target: { closest?: (selector: string) => unknown } | null): boolean {
  return Boolean(target?.closest?.('button, a, [role="button"]'));
}

/**
 * Web only: R / Space / Enter roll, Z or ⌘Z undo, Y or ⇧⌘Z redo, Esc cancels a
 * selection. Roll only fires when the human can actually roll, so a stray key
 * never triggers a phase the buttons wouldn't allow. The listener follows screen
 * focus, so opening settings does not leave the hidden game listening.
 */
export function useGameKeyboardShortcuts({
  state,
  isReviewing,
  tutorPaused,
  canUndo,
  canRedo,
  onRoll,
  onUndo,
  onRedo,
  onCancelSelection,
}: Actions) {
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !state) {
      return;
    }
    const humanTurn = !(state.mode === 'vs-computer' && state.currentPlayer === 'black');
    const canRoll = humanTurn && !isReviewing && !tutorPaused
      && (state.phase === 'rolling' || state.phase === 'opening-roll');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      const action = shortcutFor(e);
      if (!action) {
        return;
      }
      if (action === 'roll' && rollBlockedByFocus(target)) {
        return;
      }
      if (action === 'roll' && canRoll) {
        e.preventDefault();
        onRoll();
      }
      else if (action === 'undo' && canUndo) {
        e.preventDefault();
        onUndo();
      }
      else if (action === 'redo' && canRedo) {
        e.preventDefault();
        onRedo();
      }
      else if (action === 'cancel' && state.selectedPoint !== null) {
        e.preventDefault();
        onCancelSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, isReviewing, tutorPaused, canUndo, canRedo, onRoll, onUndo, onRedo, onCancelSelection]));
}
