import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

// EAS can only sign app extensions it knows about before prebuild. The iMessage
// target is added by a local config plugin, so app.config.ts must declare it in
// extra.eas.build.experimental.ios.appExtensions with the same target name and
// bundle id. If the two drift, EAS cloud iOS builds fail with
// "No profiles for '<bundle id>.messages' were found".
describe('iMessage extension is declared for EAS', () => {
  const plugin = readFileSync(join(ROOT, 'plugins/with-imessage-extension.js'), 'utf8');
  const appConfig = readFileSync(join(ROOT, 'app.config.ts'), 'utf8');

  it('declares the same target name the plugin creates', () => {
    const pluginTarget = plugin.match(/const EXT_FOLDER = '([^']+)'/)?.[1];
    expect(pluginTarget).toBe('BackgammonMastermindMessages');
    expect(appConfig).toMatch(/appExtensions:\s*\[/);
    expect(appConfig).toContain(`targetName: '${pluginTarget}'`);
  });

  it('declares the same bundle id the plugin derives', () => {
    expect(plugin).toMatch(/return `\$\{main\}\.messages`;/);
    expect(appConfig).toMatch(/bundleIdentifier: `\$\{Env\.EXPO_PUBLIC_BUNDLE_ID\}\.messages`/);
  });
});
