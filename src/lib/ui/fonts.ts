import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

/** Inter regular — postscript name on iOS/web; family + weight on Android. */
export const FONT_REGULAR = Platform.select({
  ios: 'Inter_400Regular',
  android: 'Inter',
  default: 'Inter_400Regular',
}) as string;

/** Inter bold — postscript name on iOS/web; family + weight on Android. */
export const FONT_BOLD = Platform.select({
  ios: 'Inter_700Bold',
  android: 'Inter',
  default: 'Inter_700Bold',
}) as string;

/** Inter extra-bold — postscript name on iOS/web; family + weight on Android. */
export const FONT_EXTRA_BOLD = Platform.select({
  ios: 'Inter_700Bold',
  android: 'Inter',
  default: 'Inter_800ExtraBold',
}) as string;

type InterWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const INTER_POSTSCRIPT: Record<InterWeight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

const INTER_ANDROID_WEIGHT: Record<InterWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

/** Platform-correct Inter font style. Never combine postscript fontFamily with fontWeight. */
export function interFont(weight: InterWeight): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (Platform.OS === 'android') {
    return { fontFamily: 'Inter', fontWeight: INTER_ANDROID_WEIGHT[weight] };
  }
  return { fontFamily: INTER_POSTSCRIPT[weight] };
}
