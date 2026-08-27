import { isRunningInExpoGo } from 'expo';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

import {
  getPostHogPersonContext,
  isPostHogProjectToken,
} from '@/lib/analytics/posthog-context';

const extra = Constants.expoConfig?.extra as {
  posthogProjectToken?: string;
  posthogHost?: string;
  appEnv?: string;
} | undefined;

const projectToken = extra?.posthogProjectToken;
const host = extra?.posthogHost || 'https://us.i.posthog.com';
const isPostHogConfigured = isPostHogProjectToken(projectToken);
const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
// StoreClient includes both Expo Go and expo-dev-client — use isRunningInExpoGo
// so TestFlight / standalone / development-client still get replay.
const enableNativePostHog = isNativeMobile && !isRunningInExpoGo();

if (!isPostHogConfigured && __DEV__) {
  console.warn(
    'PostHog project token not configured. Set POSTHOG_PROJECT_TOKEN in .env (or EAS env) to enable analytics and error tracking.',
  );
}

// PostHog's default storage probes expo-file-system (native-only) or
// @react-native-async-storage/async-storage. Neither is available on web in
// this app, so provide MMKV (localStorage-backed on web) explicitly.
const posthogMmkv = createMMKV({ id: 'posthog' });
const customStorage = {
  getItem: (key: string) => posthogMmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => {
    posthogMmkv.set(key, value);
  },
};

export const posthog = new PostHog(projectToken || 'placeholder_key', {
  host,
  disabled: !isPostHogConfigured,
  customStorage,
  captureAppLifecycleEvents: true,
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
  // Native replay + crashes come from @posthog/react-native-plugin (PostHog ~> 3.69).
  // pnpm.overrides drops archived posthog-react-native-session-replay (PostHog ~> 3.58.1)
  // so CocoaPods is not asked to satisfy both ranges.
  enableSessionReplay: enableNativePostHog,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: false,
    captureLog: true,
    captureNetworkTelemetry: true,
    throttleDelayMs: 1000,
  },
  // console: [] avoids duplicate reports when PostHogErrorBoundary is mounted
  // (React also logs render errors to console).
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: [],
      nativeCrashes: enableNativePostHog,
    },
  },
});

void posthog.register({
  ...getPostHogPersonContext({
    appEnv: extra?.appEnv || process.env.EXPO_PUBLIC_APP_ENV,
    platform: Platform.OS,
    configVersion: Constants.expoConfig?.version,
    nativeApplicationVersion: Application.nativeApplicationVersion,
    nativeBuildVersion: Application.nativeBuildVersion,
    iosBuildNumber: Constants.expoConfig?.ios?.buildNumber,
    androidVersionCode: Constants.expoConfig?.android?.versionCode,
  }),
  device_os: Device.osName ?? Platform.OS,
  device_os_version: Device.osVersion ?? null,
  device_model: Device.modelName ?? null,
});
