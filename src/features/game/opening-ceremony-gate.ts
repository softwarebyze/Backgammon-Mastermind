import { useSyncExternalStore } from 'react';

export type Point2 = { x: number; y: number };

export type TraySlotCenters = {
  left: Point2;
  right: Point2;
};

/** Ceremony → tray handoff: tray fades in under flying dice, then ceremony exits. */
export type CeremonyHandoff = 'hidden' | 'measure' | 'reveal';

let visible = false;
let handoff: CeremonyHandoff = 'hidden';
let traySlots: TraySlotCenters | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export function setOpeningCeremonyVisible(next: boolean) {
  if (visible === next) {
    return;
  }
  visible = next;
  if (!next) {
    handoff = 'hidden';
  }
  emit();
}

export function setOpeningCeremonyHandoff(next: CeremonyHandoff) {
  if (handoff === next) {
    return;
  }
  handoff = next;
  emit();
}

export function setOpeningTraySlots(next: TraySlotCenters | null) {
  const same = traySlots === next
    || (traySlots != null && next != null
      && traySlots.left.x === next.left.x
      && traySlots.left.y === next.left.y
      && traySlots.right.x === next.right.x
      && traySlots.right.y === next.right.y);
  if (same) {
    return;
  }
  traySlots = next;
  emit();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useOpeningCeremonyVisible(): boolean {
  return useSyncExternalStore(subscribe, () => visible, () => false);
}

export function useOpeningCeremonyHandoff(): CeremonyHandoff {
  return useSyncExternalStore(subscribe, () => handoff, () => 'hidden' as const);
}

export function useOpeningTraySlots(): TraySlotCenters | null {
  return useSyncExternalStore(subscribe, () => traySlots, () => null);
}
