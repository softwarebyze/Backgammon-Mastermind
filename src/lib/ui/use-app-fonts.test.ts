import { renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { interFont } from './fonts';
import { useAppFonts } from './use-app-fonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn(), FontDisplay: { SWAP: 'swap' } }));

const originalOS = Platform.OS;
afterEach(() => {
  Platform.OS = originalOS;
});

it('renders the web app while custom fonts are still loading', () => {
  Platform.OS = 'web';
  jest.mocked(useFonts).mockReturnValue([false, null]);
  const { result } = renderHook(() => useAppFonts());
  expect(result.current).toBe(true);
});

it('handles embedded native fonts synchronously and still supports runtime fallback', () => {
  Platform.OS = 'ios';
  jest.mocked(useFonts).mockReturnValue([true, null]);
  const { result, rerender } = renderHook(() => useAppFonts());
  expect(result.current).toBe(true);
  jest.mocked(useFonts).mockReturnValue([false, null]);
  rerender({});
  expect(result.current).toBe(false);
  jest.mocked(useFonts).mockReturnValue([false, new Error('font unavailable')]);
  rerender({});
  expect(result.current).toBe(true);
});

it('uses bundled PostScript names on iOS and filename aliases on Android', () => {
  Platform.OS = 'ios';
  expect(interFont('regular')).toEqual({ fontFamily: 'Inter-Regular' });
  expect(interFont('extrabold')).toEqual({ fontFamily: 'Inter-ExtraBold' });
  Platform.OS = 'android';
  expect(interFont('regular')).toEqual({ fontFamily: 'Inter_400Regular' });
  expect(interFont('extrabold')).toEqual({ fontFamily: 'Inter_800ExtraBold' });
});
