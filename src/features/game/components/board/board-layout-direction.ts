import type { ViewStyle } from 'react-native';
import { Platform } from 'react-native';

/**
 * Backgammon geometry is fixed (white's home is bottom-right, bear-off on the
 * right). App RTL must not mirror the board.
 *
 * Native: Yoga `direction: 'ltr'`.
 * Web: react-native-web rejects `direction` in styles. `dir="ltr"` sets the
 * locale context so flex rows and absolute `left` stay left-to-right.
 */
export const boardLayoutStyle: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'ltr' };

export const boardWebDir = Platform.OS === 'web' ? { dir: 'ltr' as const } : {};
