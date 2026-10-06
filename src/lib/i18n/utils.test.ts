import { I18nManager, Platform } from 'react-native';

import { storage } from '../storage';
import { changeLanguage, clearTranslateCache, LOCAL, translate } from './utils';

jest.mock('react-native-restart', () => ({
  restart: jest.fn(),
}));

const mockChangeLanguage = jest.fn();
const mockT = jest.fn((key: string) => key);

jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    changeLanguage: (lang: string) => mockChangeLanguage(lang),
    t: (key: string) => mockT(key),
  },
}));

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.queueMicrotask(resolve);
  });
}

describe('i18n utils', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.remove(LOCAL);
    clearTranslateCache();
    mockT.mockImplementation((key: string) => key);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('clears memoized translate after changeLanguage so strings can update without stale cache', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    mockT.mockImplementationOnce(() => 'English').mockImplementationOnce(() => 'Español');

    expect(translate('settings.title')).toBe('English');
    expect(translate('settings.title')).toBe('English');

    changeLanguage('es');

    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    expect(translate('settings.title')).toBe('Español');
  });

  it('reloads the web document after persisting a locale change', async () => {
    const reload = jest.fn();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { reload } });

    changeLanguage('fr');

    expect(reload).not.toHaveBeenCalled();
    await flushMicrotasks();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('updates RTL when switching to a right-to-left language', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const forceRTL = jest.spyOn(I18nManager, 'forceRTL');

    changeLanguage('ar');

    expect(forceRTL).toHaveBeenCalledWith(true);
    forceRTL.mockRestore();
  });
});
