import type { ViewStyle } from 'react-native';
import { Platform } from 'react-native';

/**
 * Keep a row left-to-right under an RTL app language: the backgammon board
 * (white's home is bottom-right) and digit strips (167 must not read "761").
 *
 * Native: Yoga `direction: 'ltr'`.
 * Web: react-native-web rejects `direction` in styles (and logs an error), so
 * spread `forceLtrWebDir` onto the View: `dir="ltr"` sets the locale context so
 * flex rows and absolute `left` stay left-to-right.
 */
export const forceLtrStyle: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'ltr' };

export const forceLtrWebDir = Platform.OS === 'web' ? { dir: 'ltr' as const } : {};
