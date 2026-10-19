/* eslint-disable react-refresh/only-export-components */
import type TranslateOptions from 'i18next';
import type { ReactElement } from 'react';
import type { Language, resources } from './resources';
import type { RecursiveKeyOf } from './types';
import i18n from 'i18next';
import memoize from 'lodash.memoize';
import { Fragment, useCallback } from 'react';
import { I18nManager, NativeModules, Platform } from 'react-native';

import { useMMKVString } from 'react-native-mmkv';
import RNRestart from 'react-native-restart';
import { storage } from '../storage';
import { RTL_LANGUAGES } from './resources';

type DefaultLocale = typeof resources.en.translation;
export type TxKeyPath = RecursiveKeyOf<DefaultLocale>;

export const LOCAL = 'local';

export const getLanguage = () => storage.getString(LOCAL); // 'Marc' getItem<Language | undefined>(LOCAL);

export const translate = memoize(
  (key: TxKeyPath, options = undefined) =>
    i18n.t(key, options) as unknown as string,
  (key: TxKeyPath, options: typeof TranslateOptions) =>
    options ? key + JSON.stringify(options) : key,
);

/** Drop memoized strings so the next render picks up the active i18n language. */
export function clearTranslateCache(): void {
  translate.cache?.clear?.();
}

/** Whether the active i18n language reads right-to-left. Live, so web picks it up without a reload. */
export function getIsRTL(): boolean {
  // i18next reports 'rtl' before a language is set; treat "no language" as LTR.
  return !!i18n.language && i18n.dir() === 'rtl';
}

/**
 * Layout direction for direction-sensitive styles. Native applies `I18nManager`
 * after a restart; react-native-web stubs `I18nManager`, so web follows the
 * active language (and the `<html dir>` set by `applyWebDocumentLanguage`).
 */
export function getLayoutIsRTL(): boolean {
  return Platform.OS === 'web' ? getIsRTL() : I18nManager.isRTL;
}

/**
 * react-native-web ignores `I18nManager`; layout direction comes from the DOM.
 * Setting `<html lang dir>` flips flex rows, `start`/`end` insets, and text.
 */
export function applyWebDocumentLanguage(lang: Language): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined')
    return;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
}

export function changeLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  clearTranslateCache();
  if (Platform.OS === 'web') {
    // Switch in place: a reload would wipe expo-router history (no back button).
    // Screens remount via `languageScreenLayout`, keyed on the stored language.
    applyWebDocumentLanguage(lang);
    return;
  }
  I18nManager.forceRTL(RTL_LANGUAGES.has(lang));
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    if (__DEV__)
      NativeModules.DevSettings.reload();
    else RNRestart.restart();
  }
}

export function useSelectedLanguage() {
  const [language, setLang] = useMMKVString(LOCAL, storage);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLang(lang);
      if (lang !== undefined)
        changeLanguage(lang as Language);
    },
    [setLang],
  );

  return { language: language as Language, setLanguage };
}

/**
 * Reactive `getLayoutIsRTL()` for UI that is not remounted on a language switch
 * (e.g. header buttons). Reads the stored language so React Compiler re-renders.
 */
export function useLayoutIsRTL(): boolean {
  const { language } = useSelectedLanguage();
  if (Platform.OS !== 'web')
    return I18nManager.isRTL;
  return language ? RTL_LANGUAGES.has(language) : getIsRTL();
}

function LanguageKeyed({ children }: { children: ReactElement }) {
  const { language } = useSelectedLanguage();
  return <Fragment key={language ?? 'default'}>{children}</Fragment>;
}

type ScreenLayoutProps = { route: { name: string }; children: ReactElement };

/**
 * Build a Stack `screenLayout` that remounts screen content when the language
 * changes, so `translate()` output refreshes in place on web. Navigator state
 * (history, back button) is untouched because only screen bodies are keyed.
 * Pass route names that host a nested navigator so their history survives;
 * those layouts subscribe via `useSelectedLanguage()` and key their own screens.
 */
export function languageScreenLayout(nestedNavigators: readonly string[] = []) {
  // Called as a plain function by the navigator (not rendered), so no hooks here.
  return function renderLanguageScreen({ route, children }: ScreenLayoutProps): ReactElement {
    // Native restarts on language change, so only web needs the in-place remount.
    if (Platform.OS !== 'web' || nestedNavigators.includes(route.name))
      return children;
    return <LanguageKeyed>{children}</LanguageKeyed>;
  };
}
