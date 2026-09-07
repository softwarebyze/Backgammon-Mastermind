import type { FontSource } from 'expo-font';
import { FontDisplay, useFonts } from 'expo-font';
import { Platform } from 'react-native';

import { interFont } from './fonts';

// Import only the five faces we use, not the package's all-weights barrel.
const SOURCES = {
  regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  semibold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  extrabold: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
};

const fonts: Record<string, FontSource> = Object.fromEntries(
  Object.entries(SOURCES).map(([weight, source]) => [
    interFont(weight as keyof typeof SOURCES).fontFamily!,
    { uri: source, display: FontDisplay.SWAP },
  ]),
);

/** Embedded native fonts are ready synchronously; web paints with fallback text. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fonts);
  return Platform.OS === 'web' || loaded || error !== null;
}
