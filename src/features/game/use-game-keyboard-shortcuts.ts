import type { GameState } from '@/lib/game';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';

type Actions = {
  state: GameState | null;
  isReviewing: boolean;
  tutorPaused: boolean;
  /** Confirm bar is up — Space/Enter confirm instead of rolling. */
  canConfirm: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onRoll: () => void;
  onConfirm: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCancelSelection: () => void;
};

type ShortcutEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat?: boolean;
};

type FocusTarget = {
  closest?: (selector: string) => unknown;
  tagName?: string;
} | null;

/** Which shortcut a keydown maps to, or null. Pure, so it's unit-testable. */
export function shortcutFor(
  e: ShortcutEvent,
  opts?: { awaitingConfirm?: boolean },
): 'roll' | 'confirm' | 'undo' | 'redo' | 'cancel' | null {
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
  // Space / Enter: confirm while the bar is up, otherwise roll.
  if (key === ' ' || key === 'enter') {
    return opts?.awaitingConfirm ? 'confirm' : 'roll';
  }
  if (key === 'r') {
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
export function rollBlockedByFocus(target: FocusTarget): boolean {
  return Boolean(target?.closest?.('button, a, [role="button"]'));
}

/**
 * While the Confirm bar is up, Space/Enter should confirm even if a board
 * point (also a button) still has focus after tapping. Skip when some other
 * interactive control is focused — Confirm/Undo already handle the key (don't
 * double-fire), and Leave/settings/etc. must not be stolen into a confirm.
 */
export function confirmBlockedByFocus(target: FocusTarget): boolean {
  if (!target?.closest) {
    return false;
  }
  // Focus left on the board after spending dice — still confirm.
  if (target.closest('[data-testid="board-view"]')) {
    return false;
  }
  return Boolean(target.closest('button, a, [role="button"]'));
}

/** Skip when the browser already handled it, key-repeat, or a text field has focus. */
export function shouldIgnoreShortcutKeydown(e: {
  defaultPrevented: boolean;
  repeat: boolean;
  target: { tagName?: string } | null;
}): boolean {
  if (e.defaultPrevented || e.repeat) {
    return true;
  }
  const tag = e.target?.tagName;
  return Boolean(tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag));
}

/**
 * Web only: R / Space / Enter roll (Space/Enter confirm while the confirm bar
 * is up), Z or ⌘Z undo, Y or ⇧⌘Z redo, Esc cancels a selection. Roll only
 * fires when the human can actually roll. Ignores key repeat so holding Enter
 * can't double-confirm. The listener follows screen focus.
 */
export function useGameKeyboardShortcuts({
  state,
  isReviewing,
  tutorPaused,
  canConfirm,
  canUndo,
  canRedo,
  onRoll,
  onConfirm,
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
    const confirmReady = canConfirm && !isReviewing && !tutorPaused && humanTurn;
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcutKeydown({
        defaultPrevented: e.defaultPrevented,
        repeat: e.repeat,
        target: e.target as HTMLElement | null,
      })) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const action = shortcutFor(e, { awaitingConfirm: confirmReady });
      if (!action) {
        return;
      }
      if (action === 'roll' && rollBlockedByFocus(target)) {
        return;
      }
      if (action === 'confirm' && confirmBlockedByFocus(target)) {
        return;
      }
      if (action === 'confirm' && confirmReady) {
        e.preventDefault();
        onConfirm();
      }
      else if (action === 'roll' && canRoll) {
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
  }, [
    state,
    isReviewing,
    tutorPaused,
    canConfirm,
    canUndo,
    canRedo,
    onRoll,
    onConfirm,
    onUndo,
    onRedo,
    onCancelSelection,
  ]));
}
