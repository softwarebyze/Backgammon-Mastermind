# Store screenshots

**Preferred (iOS):** EAS Metadata — put paths on `apple.info[locale].screenshots` in [`store.config.js`](../store.config.js) and run `pnpm metadata:push*` ([eas-metadata.md](./eas-metadata.md)). Display type for our 1320×2868 captures: `APP_IPHONE_67`.

**Fallback / Play:** Fastlane (`deliver` / `supply`) below.

## Source of truth

| Asset | Path |
|-------|------|
| Production iPhone 6.9" (1320×2868) | `docs/marketing/v1.0.0/app-store-screenshots/` |
| Wired into EAS Metadata | `store.config.js` → `APP_IPHONE_67` (shared across locales until localized) |
| Staged for Fastlane (generated, gitignored) | `fastlane/screenshots/en-US/` |
| Staged for Play (generated, gitignored) | `fastlane/metadata/android/en-US/images/phoneScreenshots/` |

Capture more anytime (Argent / simulator / Maestro). Prefer 1320×2868 for iPhone.

## EAS Metadata upload (iOS)

```sh
# After PNGs are under docs/marketing/… and listed in store.config.js:
pnpm metadata:push:production
```

## Fastlane fallback

```sh
pnpm screenshots:prepare          # copy marketing PNGs → fastlane folders
pnpm screenshots:asc-key          # Expo session → .cache/asc-api-key.json (gitignored)
pnpm screenshots:upload:ios       # prepare + key + bundle exec fastlane deliver (screenshots only)
pnpm screenshots:upload:android   # needs PLAY_JSON_KEY_PATH (Play Console service account)
```

Uses Bundler (`Gemfile` / `Gemfile.lock`). First time: `bundle install`.

iOS `app_version` defaults from `package.json` `version` (override with `ASC_APP_VERSION`).

## Play Store

Listing **text** lives in git under `fastlane/metadata/android/<play-locale>/`:

| File | Limit |
|------|--------|
| `title.txt` | 50 |
| `short_description.txt` | 80 |
| `full_description.txt` | 4000 |

Do not invent screenshots; phone captures are staged (gitignored) under `images/phoneScreenshots/`.

Create a Play Console app + service account JSON once, then:

```sh
export PLAY_JSON_KEY_PATH=/path/to/play-service-account.json
export PLAY_PACKAGE_NAME=com.backgammonmastermind
pnpm screenshots:upload:android
```

The `android screenshots` lane skips listing text (`skip_upload_metadata: true`). Upload copy from Play Console or a future `supply` metadata pass.

Listing copy for Apple: [eas-metadata.md](./eas-metadata.md).  
Price / privacy nutrition: ASC UI.
