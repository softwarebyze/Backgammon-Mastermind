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
export function rollBlockedByFocus(target: { closest?: (selector: string) => unknown } | null): boolean {
  return Boolean(target?.closest?.('button, a, [role="button"]'));
}

type FocusTarget = { closest?: (selector: string) => unknown } | null;

/**
 * Enter confirms whenever the confirm bar is up, even if focus stayed on
 * Live (or any other game control) after turn history. Space still activates
 * the focused button. Dialog and alert buttons keep Enter.
 */
export function shortcutSuppressedByFocus(
  action: 'roll' | 'confirm' | 'undo' | 'redo' | 'cancel' | null,
  event: { key: string },
  target: FocusTarget,
): boolean {
  if (action !== 'roll' && action !== 'confirm') {
    return false;
  }
  if (!rollBlockedByFocus(target)) {
    return false;
  }
  if (action === 'confirm' && event.key.toLowerCase() === 'enter') {
    return Boolean(target?.closest?.('[role="dialog"], [role="alertdialog"], [role="alert"]'));
  }
  return true;
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
 * fires when the human can actually roll. Enter still confirms when focus
 * stayed on another control, such as Live after turn history. Ignores key
 * repeat so holding Enter can't double-confirm. The listener follows screen focus.
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
      if (shortcutSuppressedByFocus(action, e, target)) {
        return;
      }
      if (action === 'confirm' && confirmReady) {
        e.preventDefault();
        e.stopPropagation();
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
    // Capture so Enter confirms before a focused control (Live) handles the key.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
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
