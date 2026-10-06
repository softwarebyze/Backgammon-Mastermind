import type TranslateOptions from 'i18next';
import type { Language, resources } from './resources';
import type { RecursiveKeyOf } from './types';
import i18n from 'i18next';
import memoize from 'lodash.memoize';
import { useCallback } from 'react';
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

export function changeLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  clearTranslateCache();
  I18nManager.forceRTL(RTL_LANGUAGES.has(lang));
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    if (__DEV__)
      NativeModules.DevSettings.reload();
    else RNRestart.restart();
  }
  else if (Platform.OS === 'web') {
    // Defer so MMKV flushes and we don't race picker dismiss navigation.
    globalThis.queueMicrotask(() => {
      globalThis.location?.reload();
    });
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
