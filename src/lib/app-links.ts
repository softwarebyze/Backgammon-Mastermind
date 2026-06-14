import Env from 'env';
import { Linking, Platform, Share } from 'react-native';

const REPOSITORY_URL = 'https://github.com/softwarebyze/Backgammon-Mastermind';
const SUPPORT_EMAIL = 'support@softwarebyze.com';

/** Set EXPO_PUBLIC_APP_STORE_ID in production env once App Store Connect record exists. */
const APP_STORE_ID = process.env.EXPO_PUBLIC_APP_STORE_ID?.trim() ?? '';

/** Replace with real URLs before App Store / Play Store submission. */
export const APP_LINKS = {
  github: REPOSITORY_URL,
  website: REPOSITORY_URL,
  privacy: `${REPOSITORY_URL}/blob/main/docs/privacy-policy.md`,
  terms: `${REPOSITORY_URL}/blob/main/docs/terms-of-service.md`,
  support: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${Env.EXPO_PUBLIC_NAME} support`)}`,
} as const;

export async function openExternalUrl(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error(`Cannot open URL: ${url}`);
  }
  await Linking.openURL(url);
}

export async function shareApp(): Promise<void> {
  await Share.share({
    message: `Play ${Env.EXPO_PUBLIC_NAME} — ${REPOSITORY_URL}`,
    url: REPOSITORY_URL,
    title: Env.EXPO_PUBLIC_NAME,
  });
}

export async function openStoreListing(): Promise<void> {
  const packageName = Env.EXPO_PUBLIC_PACKAGE;
  const url = Platform.select({
    ios: APP_STORE_ID
      ? `https://apps.apple.com/app/id${APP_STORE_ID}`
      : REPOSITORY_URL,
    android: `market://details?id=${packageName}`,
    default: REPOSITORY_URL,
  });

  await openExternalUrl(url);
}
