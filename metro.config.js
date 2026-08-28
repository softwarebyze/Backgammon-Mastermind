const { getPostHogExpoConfig } = require('posthog-react-native/metro');
const { withUniwindConfig } = require('uniwind/metro');

// Injects debug IDs so uploaded source maps match JS stacks in PostHog.
const config = getPostHogExpoConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
});
