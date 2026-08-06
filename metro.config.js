const { getPostHogExpoConfig } = require('posthog-react-native/metro');
const { withUniwindConfig } = require('uniwind/metro');

// getPostHogExpoConfig wraps Expo's default Metro config and injects debug IDs
// so uploaded source maps match JS stacks in PostHog error tracking.
const config = getPostHogExpoConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
});
