import Env from 'env';
import { Linking, Platform, Share } from 'react-native';

const REPOSITORY_URL = 'https://github.com/softwarebyze/Backgammon-Mastermind';
const SUPPORT_EMAIL = 'zackebenfeld@gmail.com';

/** Canonical product website (Vercel). Privacy/terms must be publicly hosted for store review. */
const WEBSITE_URL = 'https://backgammon-mastermind.vercel.app';

/** Production ASC Apple ID (6792138473). Set via EAS production env — see docs/ios-testing-and-store.md. */
const APP_STORE_ID = process.env.EXPO_PUBLIC_APP_STORE_ID?.trim() ?? '';

export const APP_LINKS = {
  github: REPOSITORY_URL,
  website: WEBSITE_URL,
  privacy: `${WEBSITE_URL}/privacy/`,
  terms: `${WEBSITE_URL}/terms/`,
  support: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${Env.EXPO_PUBLIC_NAME} support`)}`,
} as const;

export async function openExternalUrl(url: string): Promise<void> {
  // Don't gate on canOpenURL — it false-negatives for mailto: and some https schemes.
  try {
    await Linking.openURL(url);
  }
  catch {
    throw new Error(`Cannot open URL: ${url}`);
  }
}

export async function shareApp(): Promise<void> {
  await Share.share({
    message: `Play ${Env.EXPO_PUBLIC_NAME} — ${WEBSITE_URL}`,
    url: WEBSITE_URL,
    title: Env.EXPO_PUBLIC_NAME,
  });
}

export async function openStoreListing(): Promise<void> {
  const packageName = Env.EXPO_PUBLIC_PACKAGE;
  const url = Platform.select({
    ios: APP_STORE_ID
      ? `https://apps.apple.com/app/id${APP_STORE_ID}`
      : WEBSITE_URL,
    android: `https://play.google.com/store/apps/details?id=${packageName}`,
    default: WEBSITE_URL,
  });

  if (!url) {
    throw new Error('No store URL available for this platform');
  }

  await openExternalUrl(url);
}
