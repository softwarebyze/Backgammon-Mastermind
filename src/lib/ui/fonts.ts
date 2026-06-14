import { Platform } from 'react-native';

/** Inter regular — iOS uses the embedded postscript name; web/Android use "Inter" + fontWeight. */
export const FONT_REGULAR = Platform.select({
  ios: 'Inter_400Regular',
  default: 'Inter',
}) as string;

/** Inter bold — iOS uses the embedded postscript name; web/Android use "Inter" + fontWeight. */
export const FONT_BOLD = Platform.select({
  ios: 'Inter_700Bold',
  default: 'Inter',
}) as string;
