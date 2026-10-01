import { renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { interFont } from './fonts';
import { useAppFonts } from './use-app-fonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));

const originalOS = Platform.OS;
afterEach(() => {
  Platform.OS = originalOS;
});

it('waits for Inter on web and native, and still reveals the app if loading fails', () => {
  for (const os of ['web', 'ios'] as const) {
    Platform.OS = os;
    jest.mocked(useFonts).mockReturnValue([false, null]);
    const { result, rerender, unmount } = renderHook(() => useAppFonts());
    expect(result.current).toBe(false);
    jest.mocked(useFonts).mockReturnValue([true, null]);
    rerender({});
    expect(result.current).toBe(true);
    jest.mocked(useFonts).mockReturnValue([false, new Error('font unavailable')]);
    rerender({});
    expect(result.current).toBe(true);
    unmount();
  }
});

it('uses bundled PostScript names on iOS and filename aliases on Android', () => {
  Platform.OS = 'ios';
  expect(interFont('regular')).toEqual({ fontFamily: 'Inter-Regular' });
  expect(interFont('extrabold')).toEqual({ fontFamily: 'Inter-ExtraBold' });
  Platform.OS = 'android';
  expect(interFont('regular')).toEqual({ fontFamily: 'Inter_400Regular' });
  expect(interFont('extrabold')).toEqual({ fontFamily: 'Inter_800ExtraBold' });
});
