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

type ShortcutConfig = {
  canRoll: boolean;
  /** Confirm bar is up and the human may confirm right now. */
  confirmReady: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onRoll: () => void;
  onConfirm: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCancelSelection: () => void;
};

/**
 * Wire the game shortcuts onto `win`; returns the cleanup. Split from the hook
 * so tests can drive it with real DOM events.
 *
 * Confirm (Space/Enter while the bar is up) listens in the capture phase.
 * Board points are RN-web Pressables rendered as `<button>`: their keydown
 * handler calls stopPropagation() at the React root, so a bubble listener on
 * window never sees the key, and the browser then "clicks" the focused point
 * instead. Capturing lets confirm run first; preventDefault + stopPropagation
 * keep the point from also being pressed. Everything else stays on bubble so
 * a focused control's own handling still wins.
 */
export function attachGameKeyboardShortcuts(
  win: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  config: ShortcutConfig,
): () => void {
  const onKeyDownCapture = (e: KeyboardEvent) => {
    if (!config.confirmReady) {
      return;
    }
    const target = e.target as HTMLElement | null;
    if (shouldIgnoreShortcutKeydown({ defaultPrevented: e.defaultPrevented, repeat: e.repeat, target })) {
      return;
    }
    if (shortcutFor(e, { awaitingConfirm: true }) !== 'confirm' || confirmBlockedByFocus(target)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    config.onConfirm();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (shouldIgnoreShortcutKeydown({ defaultPrevented: e.defaultPrevented, repeat: e.repeat, target })) {
      return;
    }
    const action = shortcutFor(e, { awaitingConfirm: config.confirmReady });
    // Confirm is handled (or deliberately left to the focused control) in capture.
    if (!action || action === 'confirm') {
      return;
    }
    if (action === 'roll' && rollBlockedByFocus(target)) {
      return;
    }
    if (action === 'roll' && config.canRoll) {
      e.preventDefault();
      config.onRoll();
    }
    else if (action === 'undo' && config.canUndo) {
      e.preventDefault();
      config.onUndo();
    }
    else if (action === 'redo' && config.canRedo) {
      e.preventDefault();
      config.onRedo();
    }
    else if (action === 'cancel' && config.hasSelection) {
      e.preventDefault();
      config.onCancelSelection();
    }
  };
  win.addEventListener('keydown', onKeyDownCapture, true);
  win.addEventListener('keydown', onKeyDown);
  return () => {
    win.removeEventListener('keydown', onKeyDownCapture, true);
    win.removeEventListener('keydown', onKeyDown);
  };
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
    return attachGameKeyboardShortcuts(window, {
      canRoll: humanTurn && !isReviewing && !tutorPaused
        && (state.phase === 'rolling' || state.phase === 'opening-roll'),
      confirmReady: canConfirm && !isReviewing && !tutorPaused && humanTurn,
      canUndo,
      canRedo,
      hasSelection: state.selectedPoint !== null,
      onRoll,
      onConfirm,
      onUndo,
      onRedo,
      onCancelSelection,
    });
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
