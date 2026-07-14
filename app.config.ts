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

const brandIcon = './assets/brand/icon.png';
const brandSplash = './assets/brand/splash-icon.png';
const brandAdaptiveForeground = './assets/brand/adaptive-foreground.png';

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

const appPlugins: ExpoConfig['plugins'] = [
  [
    'expo-splash-screen',
    {
      backgroundColor: brand.splashBackgroundColor,
      image: brandSplash,
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
  'expo-audio',
  'expo-asset',
  'expo-image',
  'expo-localization',
  'expo-router',
  'expo-status-bar',
  'expo-updates',
  ['app-icon-badge', appIconBadgeConfig],
  [
    'expo-build-properties',
    {
      android: {
        compileSdkVersion: 36,
        targetSdkVersion: 35,
        buildToolsVersion: '36.0.0',
      },
    },
  ],
  ['react-native-edge-to-edge'],
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  owner: EXPO_ACCOUNT_OWNER,
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'backgammon-mastermind',
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  orientation: 'portrait',
  icon: brandIcon,
  userInterfaceStyle: 'dark',
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
    reactCompiler: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: brandAdaptiveForeground,
      backgroundColor: brand.adaptiveIconBackgroundColor,
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
  },
  web: {
    favicon: './assets/brand/favicon.png',
    bundler: 'metro',
  },
  plugins: appPlugins,
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});
