# Store screenshots (agents can upload)

Agents **can and should** upload App Store / Play screenshots without a human clicking ASC. EAS Metadata does **not** cover screenshots yet — use **Fastlane** (`deliver` / `supply`).

## Source of truth

| Asset | Path |
|-------|------|
| Production iPhone 6.9" (1320×2868) | `docs/marketing/v1.0.0/app-store-screenshots/` |
| Staged for Fastlane (generated, gitignored) | `fastlane/screenshots/en-US/` |
| Staged for Play (generated, gitignored) | `fastlane/metadata/android/en-US/images/phoneScreenshots/` |

Capture more anytime (Argent / simulator / Maestro). Prefer 1320×2868 for iPhone; Fastlane maps that size to `APP_IPHONE_67` (Apple’s 6.7"/6.9" slot).

## Commands

```sh
pnpm screenshots:prepare          # copy marketing PNGs → fastlane folders
pnpm screenshots:asc-key          # Expo session → .cache/asc-api-key.json (gitignored)
pnpm screenshots:upload:ios       # prepare + key + bundle exec fastlane deliver (screenshots only)
pnpm screenshots:upload:android   # needs PLAY_JSON_KEY_PATH (Play Console service account)
```

Uses Bundler (`Gemfile` / `Gemfile.lock`, Fastlane **2.237.0**). First time: `bundle install`.

iOS `app_version` defaults from `store.config.json` → `apple.version` (override with `ASC_APP_VERSION`).

Or CI / agent with env:

```sh
export ASC_KEY_ID=…
export ASC_ISSUER_ID=…
export ASC_KEY_PATH=/path/to/AuthKey_….p8
# optional overrides:
export ASC_BUNDLE_ID=com.backgammonmastermind
export ASC_APP_VERSION=1.0.0
pnpm screenshots:upload:ios
```

`screenshots:asc-key` is preferred when `eas login` already works — same ASC key EAS Submit uses (`M7LGZ9S6S2` via Expo credentials).

## Quirk (Fastlane + ASC processing)

`deliver` sometimes retries while Apple is still processing and briefly creates duplicates (capped at 10 slots). If that happens, delete extras by filename uniqueness via ASC API or re-run after a short wait. A clean set is exactly the files under `docs/marketing/…/app-store-screenshots/` (currently **6**).

## What Fastlane uploads

| Lane | Tool | Skips |
|------|------|--------|
| `fastlane ios screenshots` | `deliver` | binary, listing metadata (title/desc stay in `store.config.json`) |
| `fastlane android screenshots` | `supply` | AAB/APK, text metadata |

Listing copy: [eas-metadata.md](./eas-metadata.md).  
Price / privacy nutrition: ASC UI (or future automation).

## Play Store

Create a Play Console app + service account JSON once, then:

```sh
export PLAY_JSON_KEY_PATH=/path/to/play-service-account.json
export PLAY_PACKAGE_NAME=com.backgammonmastermind
pnpm screenshots:upload:android
```

Until that credential exists, iOS upload is fully autonomous; Android is stubbed and ready.

## Obytes / fork agents

1. Put store-ready PNGs under `docs/marketing/<version>/app-store-screenshots/`
2. Ensure Expo ASC API key is in EAS credentials (or ASC_* env)
3. Run `pnpm screenshots:upload:ios`
4. Confirm in App Store Connect → version → Screenshots

No need for a human in the ASC web UI for screenshot sets.
