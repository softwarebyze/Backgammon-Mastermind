/**
 * Guards the fix for `expo-dev-client` shipping dev-only local network
 * permissions in store builds. See docs/expo-dev-client-store-builds.md.
 *
 * The bug this locks down: `expo-dev-launcher` adds `NSBonjourServices:
 * _expo._tcp` plus an `NSLocalNetworkUsageDescription` to every build, and
 * relies on a build phase to strip them from non-Debug builds. That phase runs
 * before the app's Info.plist is written, so its `[ -f … ]` guard fails, every
 * command in it is error-suppressed, and the keys silently reach the App Store.
 * Nothing about it is visible: the archive builds, signs, uploads and passes
 * review. Only reading the shipped Info.plist shows it.
 *
 * These assert the transformation `plugins/with-dev-client-plist-keys.js`
 * applies, given the exact Info.plist state `expo-dev-launcher` leaves behind.
 *
 * Scope note: composing the *real* `expo-dev-launcher` plugin in front of ours
 * does not faithfully model `expo prebuild` — composed config-plugin mods run
 * in reverse application order, and the built-in plugins reach the chain by a
 * different route, so a simulated chain asserts the wrong thing. Ordering
 * against the real plugin is verified end to end instead: `expo prebuild` with
 * `EXPO_PUBLIC_APP_ENV=preview`, then a Release build, and the built .app is
 * checked for both keys. That result is recorded in the doc above.
 */
const plugin = require('./with-dev-client-plist-keys');

type Plist = Record<string, unknown>;

/** Minimal config surface `withInfoPlist` needs to compose a mod. */
function baseConfig() {
  return { name: 'BackgammonMastermind', slug: 'backgammon-mastermind' };
}

function withEnv<T>(env: string | undefined, fn: () => T): T {
  const previous = process.env.EXPO_PUBLIC_APP_ENV;
  if (env === undefined) {
    delete process.env.EXPO_PUBLIC_APP_ENV;
  } else {
    process.env.EXPO_PUBLIC_APP_ENV = env;
  }
  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    } else {
      process.env.EXPO_PUBLIC_APP_ENV = previous;
    }
  }
}

/** The Info.plist state `expo-dev-launcher`'s `withLocalNetworkPermission` produces. */
function devLauncherPlist(overrides: Plist = {}): Plist {
  return {
    NSAllowsLocalNetworking: true,
    NSBonjourServices: ['_expo._tcp'],
    NSLocalNetworkUsageDescription:
      'Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer.',
    ...overrides,
  };
}

/** Runs our plugin's Info.plist mod over `plist`. Composed mods are async. */
async function stripIn(env: string | undefined, plist: Plist): Promise<Plist> {
  return withEnv(env, async () => {
    const config = plugin(baseConfig() as any);
    const mod = config?.mods?.ios?.infoPlist;
    expect(typeof mod).toBe('function');
    const result = await mod({ ...config, modResults: plist, modRequest: {} });
    return result.modResults as Plist;
  });
}

describe('which environments count as store builds', () => {
  it('treats preview and production as store builds', () => {
    expect(plugin.isStoreEnvironment('preview')).toBe(true);
    expect(plugin.isStoreEnvironment('production')).toBe(true);
  });

  it('treats development as a development build', () => {
    expect(plugin.isStoreEnvironment('development')).toBe(false);
  });

  it('defaults to development when EXPO_PUBLIC_APP_ENV is unset', () => {
    // Mirrors env.ts. An unset variable must never be mistaken for a store
    // build, which is the failure direction that would strip dev-server
    // discovery out of a local dev build.
    expect(plugin.isStoreEnvironment(undefined)).toBe(false);
    expect(plugin.resolveAppEnv(undefined)).toBe('development');
  });
});

describe('development builds are left completely alone', () => {
  it('registers no Info.plist mod at all', () => {
    withEnv('development', () => {
      const config = plugin(baseConfig() as any);
      expect(config.mods?.ios?.infoPlist).toBeUndefined();
    });
  });

  it('registers no mod when the environment is unset either', () => {
    withEnv(undefined, () => {
      const config = plugin(baseConfig() as any);
      expect(config.mods?.ios?.infoPlist).toBeUndefined();
    });
  });

  it('returns the config untouched, so the dev launcher keys survive', () => {
    // Stripping these from a development build would leave the launcher unable
    // to discover a Metro server. Returning the same config object means no
    // mod is registered and the Info.plist cannot be touched at all.
    withEnv('development', () => {
      const config = baseConfig() as any;
      expect(plugin(config)).toBe(config);
    });
  });
});

describe('store builds drop the dev-launcher local network permission', () => {
  it.each(['preview', 'production'])(
    'leaves no local network permission of any kind in %s',
    async (env) => {
      const plist = await stripIn(env, devLauncherPlist());
      expect(plist.NSBonjourServices).toBeUndefined();
      expect(plist.NSLocalNetworkUsageDescription).toBeUndefined();
    },
  );

  it('removes the Bonjour service but keeps unrelated Info.plist keys', async () => {
    const plist = await stripIn('preview', devLauncherPlist());
    expect(plist.NSAllowsLocalNetworking).toBe(true);
  });
});

describe('app-declared local network usage survives', () => {
  it('keeps a custom NSLocalNetworkUsageDescription', async () => {
    const plist = await stripIn('preview', {
      NSLocalNetworkUsageDescription: 'Discovers printers on your local network.',
    });
    expect(plist.NSLocalNetworkUsageDescription).toBe(
      'Discovers printers on your local network.',
    );
  });

  it('keeps the app’s own Bonjour services while dropping _expo._tcp', async () => {
    const plist = await stripIn('preview', {
      NSBonjourServices: ['_ipp._tcp', '_expo._tcp', '_companion-link._tcp'],
    });
    expect(plist.NSBonjourServices).toEqual(['_ipp._tcp', '_companion-link._tcp']);
  });

  it('removes the key entirely when _expo._tcp was the only service', async () => {
    const plist = await stripIn('preview', { NSBonjourServices: ['_expo._tcp'] });
    expect(plist.NSBonjourServices).toBeUndefined();
  });

  it('is a no-op when there is nothing to strip', async () => {
    const plist = await stripIn('preview', { CFBundleIdentifier: 'com.example' });
    expect(plist).toEqual({ CFBundleIdentifier: 'com.example' });
  });
});
