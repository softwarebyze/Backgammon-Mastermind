# EAS Metadata (App Store listing)

**Canonical how-to** for syncing App Store listing fields from git → App Store Connect.

Source of truth: **`store.config.js`** + **`store/locales/*.json`**.  
Wired via `eas.json` → `submit.*.ios.metadataPath`.

Prefer this over one-off App Store Connect API / JWT scripts. Listing state stays in git and is re-runnable.

## Commands

| Goal | Command |
|------|---------|
| Push to **preview** ASC (TestFlight app `6781121420`) | `pnpm metadata:push` |
| Push to **production** ASC (`6792138473`) | `pnpm metadata:push:production` |
| Pull from preview / production | `pnpm metadata:pull` / `pnpm metadata:pull:production` |
| CI | Actions → **EAS Metadata Push** → pick `preview` or `production` |

Requires: Expo login or `EXPO_TOKEN`, plus App Store Connect API key in **EAS credentials** (already configured: `M7LGZ9S6S2`).

`apple.version` in `store.config.js` must match an **editable** version in that ASC app (currently `1.0.0` for production). If push fails on version, create the matching version in App Store Connect first.

## Layout

| Path | Role |
|------|------|
| `store.config.js` | Dynamic config: ASC locale map, title (Preview vs production), advisory, review, screenshots |
| `store/locales/*.json` | Localized subtitle / promo / description / keywords / release notes |
| `store.config.json` | **Pull dump only** (gitignored) — `eas metadata:pull` writes JSON beside the JS config; do not treat it as source of truth |

Preview title: when `EXPO_PUBLIC_APP_ENV=preview`, `store.config.js` sets the ASC title to **Backgammon Mastermind Preview** (Apple rejects “Beta”).

## What EAS Metadata covers

| In store config | Notes |
|-----------------|--------|
| Title, subtitle, description, keywords, promo, release notes | Every ASC locale under `apple.info` |
| Privacy / marketing / support URLs | Same block |
| **Screenshots / previews** | `apple.info[locale].screenshots` / `.previews` (e.g. `APP_IPHONE_67`) |
| Age rating questionnaire | `apple.advisory` |
| Categories | `apple.categories` |
| Review contact + notes | `apple.review` |
| Release strategy | `apple.release` |
| Copyright | `apple.copyright` (year from `store.config.js`) |

## What it does **not** cover

| Item | How agents should do it |
|------|-------------------------|
| Paid app **price** / availability | ASC Pricing UI |
| App Privacy **nutrition labels** | ASC UI for now |
| Google Play listing text / screenshots | Text: `fastlane/metadata/android/<locale>/*.txt`. Screenshots: Play Console / Fastlane `supply` ([store-screenshots.md](./store-screenshots.md)) |

Do not invent one-off ASC JWT scripts for listing fields when `metadata:push*` works.

## Screenshots (prefer EAS Metadata)

Paths are relative to the repo root, per locale:

```js
info['en-US'].screenshots = {
  APP_IPHONE_67: [
    'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-01-04-home-ready.png',
    'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-02-05-learn-hub.png',
    'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-03-06-lesson-bearing-off.png',
    'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-05-10-settings-links.png',
    'docs/marketing/v1.0.0/app-store-screenshots/iphone-69-06-vs-computer.png',
  ],
};
```

`store.config.js` attaches the current iPhone 6.9" set to **every** locale until we ship localized captures. Push with `pnpm metadata:push:production`.

Fastlane (`pnpm screenshots:upload:ios`) remains as a fallback and for Play — see [store-screenshots.md](./store-screenshots.md).

## Which ASC app?

Three App Store Connect apps — metadata push targets the submit profile’s `ascAppId`:

| Profile | Bundle ID | ASC name | Apple ID |
|---------|-----------|----------|----------|
| `preview` | `com.backgammonmastermind.preview` | Backgammon Mastermind Preview | `6781121420` |
| `production` | `com.backgammonmastermind` | Backgammon Mastermind | `6792138473` |
| *(not used for metadata)* | `com.backgammonmastermind.development` | Backgammon Mastermind Dev | `6780139011` |

See [ios-testing-and-store.md](./ios-testing-and-store.md) for submit / TestFlight wiring.

## Typical edit flow

1. Edit `store/locales/<lang>.json` (copy) and/or `store.config.js` (structure, screenshots, advisory)
2. Commit
3. `pnpm metadata:push:production` (or GHA)
4. Confirm in [App Store Connect](https://appstoreconnect.apple.com/apps/6792138473/appstore)

If you change something in the ASC dashboard that is also in the store config, run `pnpm metadata:pull:production` and **port** changes back into `store/locales` / `store.config.js` (the pull JSON is a dump, not the source).

## Related

- Release steps: [releases.md](./releases.md)
- First-time ship checklist: [production-checklist.md](./production-checklist.md)
- Expo schema: https://docs.expo.dev/eas/metadata/schema/
- Dynamic config: https://docs.expo.dev/eas/metadata/config/
