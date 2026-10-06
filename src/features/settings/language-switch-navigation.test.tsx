/**
 * Web: picking a language must switch strings in place (no reload) and keep
 * expo-router history, so Settings still has a working back button.
 */
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Platform, Pressable } from 'react-native';

import AppLayout from '@/app/(app)/_layout';
import { Text } from '@/components/ui/text';
import { changeLanguage, LOCAL, translate } from '@/lib/i18n';
import { storage } from '@/lib/storage';
import { LanguageItem } from './components/language-item';
import { LanguagePickerScreen } from './language-picker-screen';

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));

// The UI barrel pulls in the bottom-sheet modal (reanimated); only Text is needed here.
jest.mock('@/components/ui', () => ({
  Text: jest.requireActual('@/components/ui/text').Text,
}));

jest.mock('@/components/navigation/settings-header-button', () => ({
  SettingsHeaderButton: () => null,
}));

function HomeStub() {
  return (
    <Pressable testID="open-settings" onPress={() => router.push('/settings')}>
      <Text>{translate('home.vs_computer')}</Text>
    </Pressable>
  );
}

function SettingsStub() {
  return (
    <>
      <Text testID="settings-heading">{translate('settings.title')}</Text>
      <LanguageItem />
    </>
  );
}

const routes = {
  _layout: AppLayout,
  index: HomeStub,
  settings: SettingsStub,
  language: LanguagePickerScreen,
};

/** Web HeaderButton reads modifier keys off the press event (link-style press). */
function pressEscape() {
  fireEvent.press(screen.getByTestId('stack-escape-button'), {
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    button: 0,
    preventDefault: () => {},
  });
}

describe('language switch navigation (web)', () => {
  const originalPlatform = Platform.OS;
  const originalDocument = (globalThis as { document?: unknown }).document;
  const originalLocation = (globalThis as { location?: unknown }).location;
  const reload = jest.fn();
  const root = { lang: 'en', dir: 'ltr' };

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { documentElement: root },
    });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { reload } });
  });

  beforeEach(() => {
    storage.remove(LOCAL);
    reload.mockClear();
    act(() => changeLanguage('en'));
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: originalLocation });
  });

  it('keeps the Settings back button and history after picking a language', () => {
    const view = renderRouter(routes, { initialUrl: '/' });

    fireEvent.press(screen.getByTestId('open-settings'));
    expect(view.getPathname()).toBe('/settings');
    expect(screen.getByTestId('settings-heading')).toHaveTextContent('Settings');

    fireEvent.press(screen.getByText('Language'));
    expect(view.getPathname()).toBe('/language');

    fireEvent.press(screen.getByText('Español'));

    // Picker dismisses back to Settings, strings switch in place, no reload.
    expect(view.getPathname()).toBe('/settings');
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId('settings-heading')).toHaveTextContent('Ajustes');
    // Header title comes from the layout's options, not the remounted body.
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeOnTheScreen();
    expect(screen.getByText('Idioma')).toBeOnTheScreen();
    expect(root).toEqual({ lang: 'es', dir: 'ltr' });

    // History survived: the back button pops to Home instead of replacing.
    expect(router.canGoBack()).toBe(true);
    pressEscape();
    expect(view.getPathname()).toBe('/');
    expect(screen.getByText('Contra el ordenador')).toBeOnTheScreen();
  });

  it('flips <html dir> for Arabic and back for English without losing history', () => {
    const view = renderRouter(routes, { initialUrl: '/' });

    fireEvent.press(screen.getByTestId('open-settings'));
    fireEvent.press(screen.getByText('Language'));
    fireEvent.press(screen.getByText('العربية'));

    expect(view.getPathname()).toBe('/settings');
    expect(root).toEqual({ lang: 'ar', dir: 'rtl' });
    expect(router.canGoBack()).toBe(true);

    expect(screen.getByTestId('settings-heading')).toHaveTextContent(translate('settings.title'));
    expect(screen.getByTestId('settings-heading')).not.toHaveTextContent('Settings');

    // Back to English from the Arabic Settings row.
    fireEvent.press(screen.getByText('لغة'));
    fireEvent.press(screen.getByText('English'));

    expect(view.getPathname()).toBe('/settings');
    expect(root).toEqual({ lang: 'en', dir: 'ltr' });
    expect(screen.getByTestId('settings-heading')).toHaveTextContent('Settings');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeOnTheScreen();
    pressEscape();
    expect(view.getPathname()).toBe('/');
  });
});
