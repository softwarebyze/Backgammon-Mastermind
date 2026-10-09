import { I18nManager, Platform } from 'react-native';
import RNRestart from 'react-native-restart';

import { storage } from '../storage';
import { applyWebDocumentLanguage, changeLanguage, clearTranslateCache, LOCAL, translate } from './utils';

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

type FakeRoot = { lang: string; dir: string };

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.queueMicrotask(resolve);
  });
}

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

describe('i18n utils', () => {
  const originalPlatform = Platform.OS;
  const originalDocument = (globalThis as { document?: unknown }).document;
  const originalLocation = (globalThis as { location?: unknown }).location;
  let root: FakeRoot;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.remove(LOCAL);
    clearTranslateCache();
    mockT.mockImplementation((key: string) => key);
    setPlatform(originalPlatform);
    root = { lang: 'en', dir: 'ltr' };
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { documentElement: root },
    });
  });

  afterAll(() => {
    setPlatform(originalPlatform);
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: originalLocation });
  });

  it('clears memoized translate after changeLanguage so strings can update without stale cache', () => {
    setPlatform('ios');
    mockT.mockImplementationOnce(() => 'English').mockImplementationOnce(() => 'Español');

    expect(translate('settings.title')).toBe('English');
    expect(translate('settings.title')).toBe('English');

    changeLanguage('es');

    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    expect(translate('settings.title')).toBe('Español');
  });

  it('switches web strings in place without reloading the document', async () => {
    const reload = jest.fn();
    setPlatform('web');
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { reload } });
    mockT.mockImplementationOnce(() => 'Settings').mockImplementationOnce(() => 'Paramètres');

    expect(translate('settings.title')).toBe('Settings');

    changeLanguage('fr');
    await flushMicrotasks();

    expect(reload).not.toHaveBeenCalled();
    expect(RNRestart.restart).not.toHaveBeenCalled();
    expect(mockChangeLanguage).toHaveBeenCalledWith('fr');
    expect(translate('settings.title')).toBe('Paramètres');
    expect(root).toEqual({ lang: 'fr', dir: 'ltr' });
  });

  it('sets <html dir="rtl"> on web for Arabic and Hebrew, and back to ltr for English', () => {
    setPlatform('web');

    changeLanguage('ar');
    expect(root).toEqual({ lang: 'ar', dir: 'rtl' });

    changeLanguage('he');
    expect(root).toEqual({ lang: 'he', dir: 'rtl' });

    changeLanguage('en');
    expect(root).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('leaves the document alone off web', () => {
    setPlatform('ios');
    applyWebDocumentLanguage('ar');
    expect(root).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('still forces RTL on native when switching to a right-to-left language', () => {
    setPlatform('ios');
    const forceRTL = jest.spyOn(I18nManager, 'forceRTL');

    changeLanguage('ar');

    expect(forceRTL).toHaveBeenCalledWith(true);
    expect(root.dir).toBe('ltr');
    forceRTL.mockRestore();
  });
});
