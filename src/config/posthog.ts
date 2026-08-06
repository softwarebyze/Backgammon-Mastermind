import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = (Constants.expoConfig?.extra?.posthogHost as string) || 'https://us.i.posthog.com';
const appEnv
  = (Constants.expoConfig?.extra?.appEnv as string | undefined)
    || (process.env.EXPO_PUBLIC_APP_ENV as string | undefined)
    || 'development';
const isPostHogConfigured = projectToken && projectToken !== 'phc_your_project_token_here';

if (!isPostHogConfigured && __DEV__) {
  console.warn(
    'PostHog project token not configured. Set POSTHOG_PROJECT_TOKEN in .env to enable analytics.',
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

const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

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
  // Session replay is native-only (dev client / store builds — not Expo Go or web).
  enableSessionReplay: isNativeMobile,
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
      nativeCrashes: isNativeMobile,
    },
  },
});

// Same PostHog project can still be sliced in insights by app_env
// (development | preview | production). See docs/posthog.md § Environments.
void posthog.register({
  app_env: appEnv,
  platform: Platform.OS,
});
