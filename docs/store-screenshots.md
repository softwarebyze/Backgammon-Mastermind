# Store screenshots (agents can upload)

Agents **can and should** upload App Store / Play screenshots without a human clicking ASC. EAS Metadata does **not** cover screenshots yet — use **Fastlane** (`deliver` / `supply`). For **Android, Fastlane `supply` also uploads the text listing** (`title.txt`, `full_description.txt`, `short_description.txt`), since EAS Metadata is App Store only.

## Source of truth

| Asset | Path |
|-------|------|
| Raw captures (undressed) | `docs/marketing/v1.0.0/app-store-screenshots/raw/` |
| Frame manifest (layout + English headlines) | `docs/marketing/v1.0.0/screenshot-frames.json` |
| Localized screenshot copy | `docs/marketing/v1.0.0/screenshot-localizations.json` |
| Composed iPhone 6.9" (1320×2868) | `docs/marketing/v1.0.0/app-store-screenshots/iphone-69-*.png` |
| Composed iPad Pro 13" (2064×2752) | `docs/marketing/v1.0.0/app-store-screenshots/ipad-13-*.png` |
| Staged for Fastlane (generated, gitignored) | `fastlane/screenshots/<locale>/` |
| Staged for Play (generated 9:16 crop) | `fastlane/metadata/android/<locale>/images/phoneScreenshots/` |

Capture with `pnpm screenshots:capture` (production Expo web at Apple pixel sizes), then dress with screenshots compose. Prefer 1320×2868 for iPhone; Fastlane maps that size to `APP_IPHONE_67` (Apple’s 6.7"/6.9" slot). iPad 2064×2752 maps to the 13" slot.

## Commands

```sh
pnpm screenshots:prepare          # render all 17 localized sets → Apple + Play folders
pnpm screenshots:asc-key          # Expo session → .cache/asc-api-key.json (gitignored)
node scripts/dedupe-asc-screenshots.mjs # dry-run duplicate check against production ASC
pnpm screenshots:upload:ios       # prepare + key + bundle exec fastlane deliver (screenshots only)
pnpm screenshots:upload:android   # needs PLAY_JSON_KEY_PATH; PLAY_PACKAGE_NAME is optional
```

Uses Bundler (`Gemfile` / `Gemfile.lock`, Fastlane **2.239.0**). First time: `bundle install`.

Localized headline rendering uses script-specific Noto fonts in CI. On macOS,
the generator also falls back to the equivalent bundled system families
(PingFang/Hiragino, Apple SD Gothic Neo, Geeza Pro, and Kohinoor Devanagari).
Do not replace the locale-aware font stacks with a generic `sans-serif` face:
Sharp/librsvg can render unsupported CJK characters as hexadecimal boxes.

iOS `app_version` defaults from `store.config.json` → `apple.version` (override with `ASC_APP_VERSION`).

Or CI / agent with env:

```sh
export ASC_KEY_ID=…
export ASC_ISSUER_ID=…
export ASC_KEY_PATH=/path/to/AuthKey_….p8
# optional overrides:
export ASC_BUNDLE_ID=com.backgammonmastermind
export ASC_APP_VERSION=1.0.2
pnpm screenshots:upload:ios
```

`screenshots:asc-key` is preferred when `eas login` already works — same ASC key EAS Submit uses (`M7LGZ9S6S2` via Expo credentials).

## Quirk (Fastlane + ASC processing)

`deliver` sometimes retries while Apple is still processing and creates duplicates (capped at 10 slots). The iOS lane now finishes by running a guarded ASC API cleanup: it compares remote checksums with the composed source, refuses to touch unknown or missing assets, and deletes only repeated copies. A clean set is exactly the composed files under `docs/marketing/…/app-store-screenshots/` (currently **10**: 5 iPhone + 5 iPad).

To audit or repair without uploading again:

```sh
node scripts/dedupe-asc-screenshots.mjs         # dry run
node scripts/dedupe-asc-screenshots.mjs --apply # delete exact duplicates
```

Apple locks screenshots after a version is submitted and approved. For a live
`READY_FOR_SALE` version, create the next app version, upload the clean set while
it is editable, and submit that version for review.

## What Fastlane uploads

| Lane | Tool | Skips |
|------|------|--------|
| `fastlane ios screenshots` | `deliver` | binary, listing metadata (title/desc stay in `store.config.json`) |
| `fastlane android screenshots` | `supply` | AAB/APK, changelogs; uploads listing copy, icon, feature graphic, ordered phone screenshots |

Listing copy: [eas-metadata.md](./eas-metadata.md).  
Price / privacy nutrition: ASC UI (or future automation).

## Play Store

Android listing metadata lives in `fastlane/metadata/android/` (localized title and short/full description, plus contact email/website). `pnpm screenshots:prepare` syncs all 17 Play locale folders from `store.config.json` and renders their localized screenshot headlines from `screenshot-localizations.json`. The listing and screenshots are uploaded together by the `fastlane android screenshots` (`supply`) lane.

Prerequisites (Play Console):

```sh
# 1. Create a paid Game app named Backgammon Mastermind (package com.backgammonmastermind).
# 2. Complete the payments profile and set the US base price to $4.99 in App pricing.
# 3. Create a Google Cloud service account with Play Console permissions for the app.
#    Upload its JSON key to Expo EAS Credentials for Android submissions.
# 4. Give GitHub Actions the same key for Fastlane listing/screenshot uploads:
#    base64 < /path/to/play-service-account.json | tr -d '\n' | gh secret set GOOGLE_SERVICE_ACCOUNT_BASE64
```

Then **Actions → Upload Store Screenshots → android** (uses `GOOGLE_SERVICE_ACCOUNT_BASE64`); choose an existing Play release track and its version code.
The key is not a Firebase `google-services.json`; never commit either file. See
[Android Play release](./android-play-release.md) for the release gates and
local AAB workflow.

Or run supply locally:

```sh
export PLAY_JSON_KEY_PATH=/path/to/google-service-account.json
export PLAY_PACKAGE_NAME=com.backgammonmastermind
pnpm screenshots:upload:android
```

Android screenshots are a **9:16 crop** (1080×1920) of each localized iPhone 6.9" marketing set. Play rejects 1320×2868 because the long side is more than twice the short side. `pnpm screenshots:prepare` renders locale-specific marketing bands for Apple, then crops those same images from the **top** (headline + board) for Play. Re-stage after changing screenshot copy or source captures.

## Obytes / fork agents

1. Put composed PNGs under `docs/marketing/<version>/app-store-screenshots/`
2. Ensure Expo ASC API key is in EAS credentials (or ASC_* env)
3. Run `pnpm screenshots:upload:ios`
4. Confirm in App Store Connect → version → Screenshots

No need for a human in the ASC web UI for screenshot sets.
