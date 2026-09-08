import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_CONFIG = join(__dirname, '../../app.config.ts');
const EXPO_AUDIO_PLUGIN = join(
  __dirname,
  '../../node_modules/expo-audio/plugin/src/withAudio.ts',
);

describe('iOS UIBackgroundModes (App Store 2.5.4)', () => {
  it('configures expo-audio with enableBackgroundPlayback false (not the bare plugin default)', () => {
    const config = readFileSync(APP_CONFIG, 'utf8');
    expect(config).toMatch(
      /\[\s*'expo-audio',\s*\{[\s\S]*?enableBackgroundPlayback:\s*false/,
    );
  });

  it('relies on expo-audio only adding UIBackgroundModes audio when background playback is enabled', () => {
    const plugin = readFileSync(EXPO_AUDIO_PLUGIN, 'utf8');
    expect(plugin).toMatch(/enableBackgroundPlayback\s*=\s*true/);
    expect(plugin).toMatch(
      /if \(enableBackgroundRecording \|\| enableBackgroundPlayback\)/,
    );
    expect(plugin).toMatch(/UIBackgroundModes\.push\('audio'\)/);
  });
});
