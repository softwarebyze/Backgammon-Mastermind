import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';
import { createMMKV } from 'react-native-mmkv';

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = (Constants.expoConfig?.extra?.posthogHost as string) || 'https://us.i.posthog.com';
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
});
