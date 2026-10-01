import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

type InterWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const INTER_RUNTIME: Record<InterWeight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

const INTER_POSTSCRIPT: Record<InterWeight, string> = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extrabold: 'Inter-ExtraBold',
};

/** Platform-correct Inter font style. Never combine postscript fontFamily with fontWeight. */
export function interFont(weight: InterWeight): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (Platform.OS === 'ios') {
    return { fontFamily: INTER_POSTSCRIPT[weight] };
  }
  return { fontFamily: INTER_RUNTIME[weight] };
}
