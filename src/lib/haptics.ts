import * as Haptics from 'expo-haptics';

/** Haptics can throw on some Android emulators/devices — never block UI. */
function safeHaptic(fn: () => Promise<void>) {
  void fn().catch(() => {});
}

export function hapticLight() {
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticSelection() {
  safeHaptic(() => Haptics.selectionAsync());
}
