import type { ConfigContext, ExpoConfig } from '@expo/config';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import 'tsx/cjs';

// adding lint exception as we need to import tsx/cjs before env.ts is imported
// eslint-disable-next-line perfectionist/sort-imports
import Env from './env';

const brand = JSON.parse(
  readFileSync(join(__dirname, 'assets/brand/brand.config.json'), 'utf8'),
) as {
  splashBackgroundColor: string;
  adaptiveIconBackgroundColor: string;
  splashImageWidth: number;
};

const EXPO_ACCOUNT_OWNER = 'zackebenfeld';
const EAS_PROJECT_ID = '7ec6600a-8b02-4714-acc1-08385effa4c9';

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.EXPO_PUBLIC_APP_ENV !== 'production',
  badges: [
    {
      text: Env.EXPO_PUBLIC_APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.EXPO_PUBLIC_VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  owner: EXPO_ACCOUNT_OWNER,
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'backgammon-mastermind',
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.EXPO_PUBLIC_BUNDLE_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: brand.adaptiveIconBackgroundColor,
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: brand.splashBackgroundColor,
        image: './assets/splash-icon.png',
        imageWidth: brand.splashImageWidth,
      },
    ],
    [
      'expo-font',
      {
        ios: {
          fonts: [
            'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: 'Inter',
              fontDefinitions: [
                {
                  path: 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
                  weight: 400,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
                  weight: 500,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
                  weight: 600,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
                  weight: 700,
                },
              ],
            },
          ],
        },
      },
    ],
    'expo-localization',
    'expo-router',
    'expo-updates',
    ['app-icon-badge', appIconBadgeConfig],
    ['react-native-edge-to-edge'],
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});
