import type { GameState } from '@/lib/game';
import { useEffect } from 'react';
import { Platform } from 'react-native';

type Actions = {
  state: GameState | null;
  isReviewing: boolean;
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
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (mod && key === 'z') {
    return e.shiftKey ? 'redo' : 'undo';
  }
  if (mod || e.altKey) {
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

/**
 * Web only: R / Space / Enter roll, Z or ⌘Z undo, Y or ⇧⌘Z redo, Esc cancels a
 * selection. Roll only fires when the human can actually roll, so a stray key
 * never triggers a phase the buttons wouldn't allow.
 */
export function useGameKeyboardShortcuts({
  state,
  isReviewing,
  canUndo,
  canRedo,
  onRoll,
  onUndo,
  onRedo,
  onCancelSelection,
}: Actions) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !state) {
      return;
    }
    const humanTurn = !(state.mode === 'vs-computer' && state.currentPlayer === 'black');
    const canRoll = humanTurn && !isReviewing
      && (state.phase === 'rolling' || state.phase === 'opening-roll');
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      const action = shortcutFor(e);
      if (!action) {
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
  }, [state, isReviewing, canUndo, canRedo, onRoll, onUndo, onRedo, onCancelSelection]);
}
