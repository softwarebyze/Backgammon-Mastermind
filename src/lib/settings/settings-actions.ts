import Env from 'env';
import * as Linking from 'expo-linking';
import { Alert, Platform, Share } from 'react-native';

const REPO_URL = 'https://github.com/softwarebyze/Backgammon-Mastermind';

export const SETTINGS_URLS = {
  github: REPO_URL,
  website: REPO_URL,
  privacy: `${REPO_URL}/blob/main/README.md`,
  terms: `${REPO_URL}/blob/main/README.md`,
  support: `${REPO_URL}/issues/new`,
} as const;

async function openUrl(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Unable to open link', url);
    return;
  }
  await Linking.openURL(url);
}

export async function shareApp(): Promise<void> {
  await Share.share({
    title: Env.EXPO_PUBLIC_NAME,
    message: `Check out ${Env.EXPO_PUBLIC_NAME} — ${REPO_URL}`,
    url: REPO_URL,
  });
}

export async function rateApp(): Promise<void> {
  const packageName = Env.EXPO_PUBLIC_PACKAGE;
  const storeUrl
    = Platform.OS === 'ios'
      ? `https://apps.apple.com/app/${Env.EXPO_PUBLIC_BUNDLE_ID}`
      : `market://details?id=${packageName}`;
  const webFallback
    = Platform.OS === 'ios'
      ? storeUrl
      : `https://play.google.com/store/apps/details?id=${packageName}`;

  try {
    await openUrl(storeUrl);
  }
  catch {
    try {
      await openUrl(webFallback);
    }
    catch {
      Alert.alert(
        'Not on the store yet',
        'Thanks for your interest! Share feedback on GitHub while we prepare launch.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'GitHub', onPress: () => openUrl(SETTINGS_URLS.github) },
        ],
      );
    }
  }
}

export async function openSupport(): Promise<void> {
  await openUrl(SETTINGS_URLS.support);
}

export async function openPrivacy(): Promise<void> {
  await openUrl(SETTINGS_URLS.privacy);
}

export async function openTerms(): Promise<void> {
  await openUrl(SETTINGS_URLS.terms);
}

export async function openGithub(): Promise<void> {
  await openUrl(SETTINGS_URLS.github);
}

export async function openWebsite(): Promise<void> {
  await openUrl(SETTINGS_URLS.website);
}
