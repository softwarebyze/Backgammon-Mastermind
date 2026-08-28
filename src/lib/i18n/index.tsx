/* eslint-disable react-refresh/only-export-components */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import { resolveLanguage, resources } from './resources';
import { applyDocumentDirection, getLanguage } from './utils';

export * from './resources';
export * from './utils';

// Prefer languageTag (zh-Hant-TW) then languageCode (pt) via resolveLanguage.
const deviceLocale = getLocales()[0];
const deviceLanguage
  = resolveLanguage(deviceLocale?.languageTag ?? undefined)
    ?? resolveLanguage(deviceLocale?.languageCode ?? undefined);

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(getLanguage() ?? undefined) ?? deviceLanguage ?? 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4', // Updated to v4 for i18next compatibility

  // allows integrating dynamic values into translations.
  interpolation: {
    escapeValue: false, // escape passed in values to avoid XSS injections
  },
});

// Is it a RTL language?
export const isRTL: boolean = i18n.dir() === 'rtl';

// Always allow RTL so switching into Arabic/Hebrew at runtime can flip layout.
I18nManager.allowRTL(true);
I18nManager.forceRTL(isRTL);

const activeLang = resolveLanguage(i18n.language);
if (activeLang)
  applyDocumentDirection(activeLang);
else if (isRTL)
  applyDocumentDirection('ar');

export default i18n;
