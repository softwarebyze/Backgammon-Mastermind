import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

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
