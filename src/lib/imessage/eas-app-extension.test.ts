import type { ConfigContext, ExpoConfig } from '@expo/config';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

type AppExtension = { targetName?: string; bundleIdentifier?: string };

// Resolves app.config.ts for one flavor, the same way `expo config` does, so
// the assertions below check what EAS actually reads (a misspelled key or a
// wrong nesting level drops the declaration and fails here).
function resolveConfig(flavor: string): ExpoConfig {
  const previous = process.env.EXPO_PUBLIC_APP_ENV;
  process.env.EXPO_PUBLIC_APP_ENV = flavor;
  try {
    let resolved: ExpoConfig | undefined;
    jest.isolateModules(() => {
      const mod = require('../../../app.config') as {
        default: (ctx: ConfigContext) => ExpoConfig;
      };
      resolved = mod.default({ config: {} } as ConfigContext);
    });
    return resolved!;
  }
  finally {
    if (previous === undefined)
      delete process.env.EXPO_PUBLIC_APP_ENV;
    else
      process.env.EXPO_PUBLIC_APP_ENV = previous;
  }
}

// EAS can only sign app extensions it knows about before prebuild. The iMessage
// target is added by a local config plugin, so app.config.ts must declare it in
// extra.eas.build.experimental.ios.appExtensions with the same target name and
// bundle id. If the two drift, EAS cloud iOS builds fail with
// "No profiles for '<bundle id>.messages' were found".
describe('iMessage extension is declared for EAS', () => {
  const plugin = readFileSync(join(ROOT, 'plugins/with-imessage-extension.js'), 'utf8');
  const pluginTarget = plugin.match(/const EXT_FOLDER = '([^']+)'/)?.[1];

  it('the plugin creates the target and derives <host>.messages', () => {
    expect(pluginTarget).toBe('BackgammonMastermindMessages');
    expect(plugin).toMatch(/return `\$\{main\}\.messages`;/);
  });

  it.each(['production', 'preview', 'development'])(
    'resolved %s config declares exactly the plugin target at <host>.messages',
    (flavor) => {
      const config = resolveConfig(flavor);
      const host = config.ios?.bundleIdentifier;
      expect(host).toEqual(expect.stringMatching(/^com\.backgammonmastermind/));

      // Exact key path EAS reads; no optional chaining past `extra` so a
      // renamed or misspelled level resolves to undefined and fails.
      const appExtensions = (config.extra as any)?.eas?.build?.experimental?.ios?.appExtensions as AppExtension[] | undefined;
      expect(appExtensions).toEqual([
        { targetName: pluginTarget, bundleIdentifier: `${host}.messages` },
      ]);
    },
  );
});
