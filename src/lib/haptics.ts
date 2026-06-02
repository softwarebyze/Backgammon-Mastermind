import * as Haptics from 'expo-haptics';

export function hapticLight(): void {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function hapticSelection(): void {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.selectionAsync();
  }
}
