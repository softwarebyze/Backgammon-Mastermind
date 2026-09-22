# Screenmap CI

Visual navigation maps for this Expo app. Workflows: `.github/workflows/screenmap-pr.yml` (PRs) and `screenmap-baseline.yml` (`main`). Both capture **iOS + Android**, then merge into one `.scrmap` with a platform switcher.

CI pins `aleqsio/screenmap@c54219e` (current `main`). Marketplace `@v1` is iOS-only and rejects the `platform` input.

Config: `.screenmap/config.json` (Learn lesson id `goal-board`). Agent guidance: `.screenmap/SKILL.md`.

Deep links: `config.json` sets `scheme: backgammonmastermind.dev` (the `development` scheme from `env.ts`). Baseline mode fails with `no deep-link scheme` without it. Screenmap uses one scheme for both platforms, so the Android Screenmap APK is built with `APP_ENV=development` to match the iOS `development-simulator` prebuilt — unlike the Maestro e2e workflows, which build the same APK with `APP_ENV=preview`.

## Platforms

| Job | Runner | Binary | EAS |
| --- | --- | --- | --- |
| `android` | `ubuntu-latest` | In-CI Gradle debug APK via `./.github/actions/setup-jdk-generate-apk` (`APP_ENV: development` → `android-test.apk`) | **Not used** |
| `ios` | `macos-26` | Prebuilt simulator `.app` if present; else `eas_profile: development-simulator` | Fallback only |
| `merge` | `ubuntu-latest` | `screenmap-ci merge` then publish/comment once | — |

The Android APK is the same Maestro e2e build: it **omits expo-dev-client**. If Screenmap later needs a true dev client, switch the android job to `eas_profile: development-emulator` + `expo_token` (profile already in `eas.json`).

Anthropic is optional. Workflows omit `agent_provider` / `agent_api_key`.

## Avoid EAS iOS quota (until Thu 1 Oct 2026)

Cloud iOS builds on the Expo Free plan are exhausted. Prefer a local simulator `.app`.

### One-time on a Mac

```sh
# Dev-client simulator build (Screenmap default profile)
eas build -p ios --profile development-simulator --local

# Or, if the Xcode project is generated:
# npx expo run:ios --configuration Release
```

Find the `.app` (EAS `--local` prints the path; often under `*.tar.gz` / `ios/build/Build/Products/`). Then:

```sh
ditto -c -k --keepParent /path/to/*.app BackgammonMastermind.app.zip

gh release create screenmap-ios-devclient BackgammonMastermind.app.zip \
  --repo softwarebyze/Backgammon-Mastermind \
  --title "Screenmap iOS simulator dev client" \
  --notes "Prebuilt development-simulator .app for Screenmap CI."
```

If the release already exists:

```sh
gh release upload screenmap-ios-devclient BackgammonMastermind.app.zip --clobber \
  --repo softwarebyze/Backgammon-Mastermind
```

Do **not** commit the `.app` or zip.

### Alternative: URL → Actions

Actions → **screenmap · store iOS simulator app** → paste an HTTPS URL to the zip. That uploads artifact `screenmap-ios-app` and updates the same release tag.

CI looks for the release first, then the latest successful `screenmap-ios-app` artifact. If neither exists, iOS falls back to `EXPO_TOKEN` + EAS (blocked on Free-plan quota until October).

## After merge to main

Run **screenmap · baseline** once (`workflow_dispatch`) or push to `main`. PR diffs need that baseline map on the `screenmaps` branch.

Until that exists, PR capture jobs stay green (Android still builds the Gradle APK) but skip packing a `.scrmap`. The sticky comment is **no-baseline**, not a failed run. `auto_baseline` cannot dispatch `screenmap-baseline.yml` until that workflow is on the default branch.

## Cost

iOS is macOS (~10× Linux). Android is `ubuntu-latest` (~1/10th).
