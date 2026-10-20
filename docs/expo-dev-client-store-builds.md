# `expo-dev-client` in store builds

Status: **fixed** by `plugins/with-dev-client-plist-keys.js`. See
[The fix](#the-fix).

Severity: **low.** Permissions hygiene, not a functional break, not a
regression, and not introduced by the iMessage work. The store binary no longer
requests local network access. See
[Not a functional break](#not-a-functional-break).

## What is in a store build

Verified against the TestFlight 13 archive
(`/tmp/bm-archive.xcarchive`, Release configuration):

| Signal | Present in Release? | Check |
| --- | --- | --- |
| `EXDevLauncher` symbols linked | yes | `nm` on the binary |
| `NSBonjourServices = ["_expo._tcp"]` | yes | `plutil -extract NSBonjourServices json -o - <app>/Info.plist` |
| `NSLocalNetworkUsageDescription` = "Expo Dev Launcher uses the local network…" | yes | `plutil -extract NSLocalNetworkUsageDescription raw -o - <app>/Info.plist` |

So a store build autolinks the dev launcher and advertises itself on the local
network for development-server discovery.

## Root cause chain

1. `expo-dev-client` (`~57.0.19`) is in `dependencies` in `package.json`, **not**
   `devDependencies`.
2. `expo prebuild` autolinks everything in `dependencies`, with no condition on
   build configuration. Debug, Release, and store builds are identical here.
3. `expo-dev-launcher`'s config plugin injects the two Info.plist keys.

Nothing about this is iMessage-specific, and nothing about it is caused by
building the archive locally rather than through EAS. EAS runs the same
`expo prebuild` against the same `package.json`, so **every** build of this app —
including the 1.0.x production builds currently live on the App Store — carries
the same autolinked dev launcher.

## The strip phase that should prevent this

`expo-dev-launcher`'s plugin also adds a build phase, `[Expo Dev Launcher] Strip
Local Network Keys for Release` (`F58A6DE7`, attached to the `BackgammonMastermind`
target), which removes both keys when `$CONFIGURATION != "Debug"`. Source:
`node_modules/expo-dev-launcher/plugin/src/withDevLauncher.ts`.

Intended behaviour is therefore that store builds ship without these keys — and
they do not. The keys survive into the Release archive.

What was ruled out:

- **Not an orphaned phase.** It is in the app target's `buildPhases` list.
- **Not skipped by Xcode.** Build output notes the phase will run on every build.
- **Not a broken script.** Running the phase's logic verbatim against the
  *shipped* binary plist deletes `NSBonjourServices:0`, removes
  `NSBonjourServices`, and exits clean. `COUNT` resolves to `1` as intended.
- **Not a wrong path.** `${TARGET_BUILD_DIR}/${INFOPLIST_PATH}` resolves to a
  real binary plist that contains the key.

**Root cause (confirmed by instrumenting the phase and running a Release
build):** the app target's `Info.plist` is produced by a `ProcessInfoPlistFile`
task that runs **after** this script phase. At phase time
`${TARGET_BUILD_DIR}/${INFOPLIST_PATH}` does not exist, so the `[ -f ]` guard
fails and the entire body is skipped. Every command in the script is
error-suppressed (`2>/dev/null`, `|| true`), so the failure is completely
silent — no warning, no output, exit 0.

Captured from a Release build of the app target (`xcodebuild -workspace
ios/BackgammonMastermind.xcworkspace -scheme BackgammonMastermind
-configuration Release -sdk iphonesimulator`):

```text
[DIAG] CONFIGURATION=Release INFOPLIST_PATH=BackgammonMastermind.app/Info.plist
[DIAG] plist MISSING
```

The same build then produces `BackgammonMastermind.app/Info.plist` (2622 bytes)
containing `NSBonjourServices = ["_expo._tcp"]`, which confirms the path is
correct and only the **timing** is wrong. Note `-target` must not be used for
this: it bypasses CocoaPods and fails with missing Expo module maps. Use the
workspace and scheme.

This is an upstream ordering bug in `expo-dev-launcher`'s plugin: the phase is
inserted at a point where the target's own Info.plist has not been generated
yet.

Note this is a **separate** issue from excluding the package. Fixing the strip
phase would clean the permissions but leave the symbols linked.

## Not a functional break

The dev launcher activates when the app is launched with a dev-server URL, or
when `EXDevLauncher.isDevLauncher` is true. A store Release build with no
embedded dev-launcher configuration launches normally. This mechanism is
understood, not measured here.

Consequence: the shipped app requests local-network access it has no use for,
and carries dev-launcher symbols. That is the whole harm.

This was briefly suspected as the cause of an iMessage extension that failed to
appear in the Messages `+` drawer. That theory was wrong twice over — see
[imessage-extension.md](./imessage-extension.md).

## Why the obvious fix does not work

**`expo.install.exclude` is the wrong key.** It currently holds only
`eslint-config-expo` and governs dependency *installation/validation* by
`expo install` and doctor. It does not affect native autolinking. Adding
`expo-dev-client` there would change nothing about the binary.

**The real key is `expo.autolinking.exclude`.** It is honoured as a `Set` of
package names in
`node_modules/expo-modules-autolinking/build/reactNativeConfig/reactNativeConfig.js`
(`excludeNames.has(resolution.name)`), consumed via
`autolinkingOptions.exclude`.

**It cannot be gated on an environment variable.** `parsePackageJsonOptions` in
`node_modules/expo-modules-autolinking/build/commands/autolinkingOptions.js` reads
`packageJson.expo.autolinking` from the literal `package.json` file. It is static
JSON. `EAS_BUILD_PROFILE` is not consulted, and `app.config.ts` cannot influence
it. A conditional exclude therefore requires something to rewrite `package.json`
before prebuild runs.

## The blocker: the dev client is load-bearing

A static exclude would break the documented dev workflow. `expo-dev-client`
supports:

- `pnpm build:development:ios` / `:android` / `--local` (`eas.json` profiles
  `development`, `development-simulator`, `development-emulator`, all
  `distribution: internal`)
- CI `dev-client.yml`
- Maestro e2e runs against `com.backgammonmastermind.development`

No app code imports `expo-dev-client` or `expo-dev-launcher`. The only references
are a CSS selector (`#expo-dev-client-menu` in `src/app/+html.tsx`) and a comment
(`src/config/posthog.ts`). So removal is safe for the *app*; it is the developer
tooling that depends on it.

## What the ecosystem actually does

Checked against Expo SDK 57 sources and docs rather than assumed:

1. **Expo's own templates do not ship `expo-dev-client` at all.** Neither
   `templates/expo-template-default/package.json` nor
   `templates/expo-template-bare-minimum/package.json` lists it. It is opt-in,
   added only by apps that want development builds. This project inherited it
   from the obytes template, not from Expo.
2. **The documented exclusion mechanism is `expo.autolinking.<platform>.exclude`**
   in `package.json` ([docs](https://docs.expo.dev/modules/autolinking#exclude)),
   e.g. `expo.autolinking.ios.exclude`. Since SDK 54 it applies to React Native
   modules as well as Expo modules, not just Expo modules.
3. **That path had a real bug, now fixed.** expo/expo#38169 is precisely this
   package set — `expo-dev-client`, `expo-dev-launcher`, `expo-dev-menu`,
   `expo-dev-menu-interface` — failing to be excluded because multiple
   `--exclude` values were passed as one space-joined argument. Fixed by
   expo/expo#40014 (2025-09-26), so SDK 57 is not affected.
4. **There is no supported per-build-profile conditional.** `exclude` is read
   from the literal `package.json` by `parsePackageJsonOptions`. So the ecosystem
   answer to "dev builds yes, store builds no" is: nobody does that. Apps either
   omit the package, exclude it unconditionally, or keep it and rely on the
   strip phase.

## The fix

`plugins/with-dev-client-plist-keys.js`, registered in `app.config.ts`. It edits
the app Info.plist at prebuild time instead of relying on a build phase.

A corrected build phase was tried first and abandoned. Declaring the built
Info.plist as an `inputPath` does make Xcode order the phase after
`ProcessInfoPlistFile` — the dependency edge is visible in the build log — but it
then fails the build outright:

```text
error: Cycle inside BackgammonMastermind; building could produce unreliable results.
```

`ProcessInfoPlistFile` transitively depends on the script phase, so there is no
way to order a script phase after the plist is written. Prebuild has no such
problem: ordering is deterministic there.

The trade-off is that prebuild cannot see the build configuration, so the gate
is the app environment instead:

| `EXPO_PUBLIC_APP_ENV` | Profiles | Behaviour |
| --- | --- | --- |
| `development` | `development`, `development-simulator`, `development-emulator`, `simulator`, local default | keys **kept** — the dev launcher needs them for mDNS discovery |
| `preview` | `preview` (TestFlight) | keys **stripped** |
| `production` | `production` | keys **stripped** |

An unset variable resolves to `development`, so a store build is never reached
by accident. A local Release build in a `development` environment keeps the
keys, which is the harmless direction: that build can still reach a dev server.
Store builds are the ones that get cleaned.

Only `_expo._tcp` and a description beginning `"Expo Dev Launcher"` are removed,
so an app-declared Bonjour service or a real local network usage description
survives.

### Verified

- `expo prebuild` with `EXPO_PUBLIC_APP_ENV=preview` → both keys absent from
  `ios/BackgammonMastermind/Info.plist`.
- `expo prebuild` with `EXPO_PUBLIC_APP_ENV=development` → both keys present.
- Release build of the app target → `BUILD SUCCEEDED`, no cycle, and both keys
  absent from the built `BackgammonMastermind.app/Info.plist`, with the Messages
  `.appex` still embedded.

Build with the workspace and scheme, not `-target`; `-target` bypasses
CocoaPods and fails with missing Expo module maps:

```sh
xcodebuild -workspace ios/BackgammonMastermind.xcworkspace \
  -scheme BackgammonMastermind -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build
```

`plugins/with-dev-client-plist-keys.test.ts` covers the gate and the
transformation, and fails without the fix.

### Still open

This removes the permission, not the linked `EXDevLauncher` symbols. Dropping
the symbols needs the package excluded, which is a separate decision because
`expo-dev-client` is load-bearing for the development-client workflow — and
`expo.autolinking.exclude` cannot be scoped to a build profile, only applied
unconditionally. Left alone deliberately.

The upstream `expo-dev-launcher` strip phase is still injected and still no-ops.
It is inert and harmless; removing it means patching upstream output, so it was
left in place rather than fought.

## Provenance

`expo-dev-client` arrived with the obytes template scaffold in commit `81ff3a49`
(2026-05-21). It has therefore been present in every build since the project
began, including the shipped production builds.

## Verifying

```sh
APP=/path/to/BackgammonMastermind.app

# autolinked dev launcher?
nm -gU "$APP/BackgammonMastermind" 2>/dev/null | grep -c EXDevLauncher

# permissions that should be absent from a Release build
plutil -extract NSBonjourServices json -o - "$APP/Info.plist" 2>&1 | head -1
plutil -extract NSLocalNetworkUsageDescription raw -o - "$APP/Info.plist" 2>&1 | head -1

# is the strip phase attached to the app target?
grep -c "Strip dev-launcher-specific local network" ios/BackgammonMastermind.xcodeproj/project.pbxproj
```
