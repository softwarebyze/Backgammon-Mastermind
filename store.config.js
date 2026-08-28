/**
 * Dynamic EAS Metadata config (https://docs.expo.dev/eas/metadata/config/).
 *
 * Listing copy lives in store/locales/*.json. This file maps language packs onto
 * every App Store Connect locale code and optionally overrides the title for the
 * preview/TestFlight ASC app when EXPO_PUBLIC_APP_ENV=preview.
 *
 * Screenshots: apple.info[locale].screenshots (EAS Metadata — prefer over Fastlane).
 */
const { readdirSync, readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = __dirname;
const LOCALES_DIR = join(ROOT, 'store/locales');
const TITLE = 'Backgammon Mastermind';
const PREVIEW_TITLE = 'Backgammon Mastermind Preview';

const MARKETING_URL = 'https://backgammon-mastermind.vercel.app';
const SUPPORT_URL = 'https://github.com/softwarebyze/Backgammon-Mastermind/issues';
const PRIVACY_URL = 'https://backgammon-mastermind.vercel.app/privacy/';

/** ASC locale code → store/locales/{file}.json (without .json). */
const ASC_LOCALE_PACK = {
  'ar-SA': 'ar',
  'ca': 'ca',
  'zh-Hans': 'zh-Hans',
  'zh-Hant': 'zh-Hant',
  'hr': 'hr',
  'cs': 'cs',
  'da': 'da',
  'nl-NL': 'nl',
  'en-AU': 'en',
  'en-CA': 'en',
  'en-GB': 'en',
  'en-US': 'en',
  'fi': 'fi',
  'fr-CA': 'fr',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'el': 'el',
  'he': 'he',
  'hi': 'hi',
  'hu': 'hu',
  'id': 'id',
  'it': 'it',
  'ja': 'ja',
  'ko': 'ko',
  'ms': 'ms',
  'no': 'no',
  'pl': 'pl',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt',
  'ro': 'ro',
  'ru': 'ru',
  'sk': 'sk',
  'es-MX': 'es',
  'es-ES': 'es',
  'sv': 'sv',
  'th': 'th',
  'tr': 'tr',
  'uk': 'uk',
  'vi': 'vi',
};

const IPHONE_67_SCREENSHOTS = [
  'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-01-04-home-ready.png',
  'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-02-05-learn-hub.png',
  'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-03-06-lesson-bearing-off.png',
  'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-05-10-settings-links.png',
  'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-06-vs-computer.png',
].filter(rel => existsSync(join(ROOT, rel)));

function loadPack(name) {
  const path = join(LOCALES_DIR, `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildInfo(title) {
  const info = {};
  for (const [ascLocale, packName] of Object.entries(ASC_LOCALE_PACK)) {
    const pack = loadPack(packName);
    info[ascLocale] = {
      title,
      subtitle: pack.subtitle,
      promoText: pack.promoText,
      description: pack.description,
      keywords: pack.keywords,
      releaseNotes: pack.releaseNotes,
      marketingUrl: MARKETING_URL,
      supportUrl: SUPPORT_URL,
      privacyPolicyUrl: PRIVACY_URL,
    };

    // Share the same screenshot set across locales until we localize captures.
    if (IPHONE_67_SCREENSHOTS.length > 0) {
      info[ascLocale].screenshots = {
        APP_IPHONE_67: IPHONE_67_SCREENSHOTS,
      };
    }
  }
  return info;
}

function assertLocaleCoverage() {
  const files = new Set(
    readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')),
  );
  const missing = [...new Set(Object.values(ASC_LOCALE_PACK))].filter(p => !files.has(p));
  if (missing.length > 0) {
    throw new Error(`Missing store/locales packs: ${missing.join(', ')}`);
  }
}

module.exports = () => {
  assertLocaleCoverage();

  const isPreview = process.env.EXPO_PUBLIC_APP_ENV === 'preview';
  const title = isPreview ? PREVIEW_TITLE : TITLE;

  return {
    configVersion: 0,
    apple: {
      version: '1.0.0',
      copyright: `${new Date().getFullYear()} Zachary Ebenfeld`,
      categories: [
        ['GAMES', 'GAMES_BOARD', 'GAMES_STRATEGY'],
        'ENTERTAINMENT',
      ],
      advisory: {
        alcoholTobaccoOrDrugUseOrReferences: 'NONE',
        contests: 'NONE',
        gambling: false,
        gamblingSimulated: 'NONE',
        horrorOrFearThemes: 'NONE',
        matureOrSuggestiveThemes: 'NONE',
        medicalOrTreatmentInformation: 'NONE',
        profanityOrCrudeHumor: 'NONE',
        sexualContentGraphicAndNudity: 'NONE',
        sexualContentOrNudity: 'NONE',
        unrestrictedWebAccess: false,
        violenceCartoonOrFantasy: 'NONE',
        violenceRealistic: 'NONE',
        violenceRealisticProlongedGraphicOrSadistic: 'NONE',
        kidsAgeBand: null,
        ageRatingOverride: 'NONE',
        koreaAgeRatingOverride: 'NONE',
      },
      info: buildInfo(title),
      release: {
        automaticRelease: false,
        phasedRelease: false,
      },
      review: {
        firstName: 'Zachary',
        lastName: 'Ebenfeld',
        email: 'zackebenfeld@gmail.com',
        phone: '+1 954 593 1670',
        demoRequired: false,
        notes:
          'Backgammon Mastermind is a paid board game (no IAP, no login). Open the app and tap Learn to Play for guided lessons, or tap vs Computer / 2 Players to start a match. Roll dice and move checkers by tap or drag. All game logic runs on device. Optional anonymous product analytics (PostHog) may be sent when online.',
      },
    },
  };
};
