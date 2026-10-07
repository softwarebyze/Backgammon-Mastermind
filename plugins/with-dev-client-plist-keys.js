/**
 * Expo config plugin: keep dev-launcher-only local network permissions out of
 * store builds.
 *
 * Why this has to exist — full write-up in docs/expo-dev-client-store-builds.md.
 *
 * `expo-dev-client` is a `dependencies` entry, so `expo prebuild` autolinks it
 * into every build, store builds included. `expo-dev-launcher`'s own plugin
 * then adds two keys to the app's Info.plist:
 *
 *   NSBonjourServices            ["_expo._tcp"]
 *   NSLocalNetworkUsageDescription  "Expo Dev Launcher uses the local network…"
 *
 * Both are only meaningful for a development build, where the launcher uses
 * them to discover a Metro server over mDNS. In a store build they are a local
 * network permission the app has no use for.
 *
 * `expo-dev-launcher` tries to strip them itself with a build phase, and that
 * has never worked. Confirmed against a real Release build: the phase's
 * `[ -f "${TARGET_BUILD_DIR}/${INFOPLIST_PATH}" ]` guard fails because the app
 * target's Info.plist is produced by a `ProcessInfoPlistFile` task that runs
 * after the script phase, and every command in that script is
 * error-suppressed (`2>/dev/null`, `|| true`), so it exits 0 with no output
 * and the keys ship anyway.
 *
 * Rewriting the phase was tried first and abandoned: declaring the built
 * Info.plist as an `inputPath` makes Xcode's dependency analysis report
 * "Cycle inside BackgammonMastermind", because `ProcessInfoPlistFile`
 * transitively depends on the script phase. There is no reliable way to order
 * a script phase after the plist is written.
 *
 * So this edits the Info.plist at prebuild time instead, where ordering is
 * deterministic. The trade-off is that prebuild cannot see the build
 * configuration, so the gate is the app environment instead:
 *
 *   development  -> keep the keys (dev launcher needs them; every internal
 *                   eas.json profile and the local default set this)
 *   preview      -> strip (store/TestFlight distribution)
 *   production   -> strip (store distribution)
 *
 * A local Release build in a `development` environment therefore keeps the
 * keys, which is the harmless direction: that build can still reach a dev
 * server. Store builds are the ones that get cleaned.
 */

const { withInfoPlist } = require('@expo/config-plugins');

const DEV_LAUNCHER_BONJOUR_SERVICE = '_expo._tcp';

/** `expo-dev-launcher`'s exact wording. Never delete a different description. */
const DEV_LAUNCHER_DESCRIPTION_PREFIX = 'Expo Dev Launcher';

/**
 * Every profile that ships to TestFlight/the App Store sets one of these; every
 * internal profile, and the local default when unset, is `development`.
 * Mirrors env.ts's `EXPO_PUBLIC_APP_ENV` enum.
 */
const DEV_ENV = 'development';

/** Mirrors env.ts: an unset `EXPO_PUBLIC_APP_ENV` means development. */
function resolveAppEnv(env) {
  return env ?? DEV_ENV;
}

/**
 * Store builds are `preview` and `production`; every internal eas.json profile
 * and the local default are `development`. Defaults to development when unset,
 * so an unset variable can never be mistaken for a store build.
 */
function isStoreEnvironment(env) {
  return resolveAppEnv(env) !== DEV_ENV;
}

/**
 * @param {import('@expo/config-types').ExpoConfig} config
 */
module.exports = function withDevClientPlistKeys(config) {
  if (!isStoreEnvironment(process.env.EXPO_PUBLIC_APP_ENV)) {
    return config;
  }

  return withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;

    // Drop only the dev launcher's own Bonjour service, preserving anything
    // the app legitimately declares for local network discovery.
    if (Array.isArray(plist.NSBonjourServices)) {
      const kept = plist.NSBonjourServices.filter(
        (service) => service !== DEV_LAUNCHER_BONJOUR_SERVICE,
      );
      if (kept.length > 0) {
        plist.NSBonjourServices = kept;
      } else {
        delete plist.NSBonjourServices;
      }
    }

    const description = plist.NSLocalNetworkUsageDescription;
    if (
      typeof description === 'string' &&
      description.startsWith(DEV_LAUNCHER_DESCRIPTION_PREFIX)
    ) {
      delete plist.NSLocalNetworkUsageDescription;
    }

    return cfg;
  });
};

module.exports.DEV_LAUNCHER_BONJOUR_SERVICE = DEV_LAUNCHER_BONJOUR_SERVICE;
module.exports.DEV_LAUNCHER_DESCRIPTION_PREFIX = DEV_LAUNCHER_DESCRIPTION_PREFIX;
module.exports.DEV_ENV = DEV_ENV;
module.exports.resolveAppEnv = resolveAppEnv;
module.exports.isStoreEnvironment = isStoreEnvironment;
