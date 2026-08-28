import { useSyncExternalStore } from 'react';

export type BoardSlotSize = {
  width: number;
  height: number;
};

const EMPTY_SLOT: BoardSlotSize = { width: 0, height: 0 };

let slot: BoardSlotSize = EMPTY_SLOT;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Leftover board slot from onLayout. Ignored when width/height is not positive. */
export function setBoardSlotSize(next: BoardSlotSize) {
  if (next.width <= 0 || next.height <= 0) {
    return;
  }
  const width = Math.round(next.width);
  const height = Math.round(next.height);
  if (slot.width === width && slot.height === height) {
    return;
  }
  slot = { width, height };
  emit();
}

/** Clear so a later screen (Learn, home) does not inherit the game slot. */
export function clearBoardSlotSize() {
  if (slot.width === 0 && slot.height === 0) {
    return;
  }
  slot = EMPTY_SLOT;
  emit();
}

export function useBoardSlotSize(): BoardSlotSize {
  return useSyncExternalStore(subscribe, () => slot, () => slot);
}
