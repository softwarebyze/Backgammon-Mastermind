# EAS Metadata (App Store listing)

**Canonical how-to** for syncing App Store listing fields from git → App Store Connect.

Source of truth: **`store.config.json`** at the repo root.  
Wired via `eas.json` → `submit.*.ios.metadataPath`.

The **preview** profile pushes a generated `store.preview.config.json` (gitignored) — identical to the canonical config except the app name is **Backgammon Mastermind Preview** (ASC names must be unique, so the TestFlight app can't share production's name; Apple/EAS reject "Beta"-style names, hence "Preview"). `pnpm metadata:push` regenerates it automatically via `scripts/make-preview-store-config.mjs`; never edit the generated file.

Prefer this over one-off App Store Connect API / JWT scripts. Listing state stays in git and is re-runnable.

## Commands

| Goal | Command |
|------|---------|
| Push to **preview** ASC (TestFlight app `6781121420`) | `pnpm metadata:push` |
| Push to **production** ASC (`6792138473`) | `pnpm metadata:push:production` |
| Pull from preview / production | `pnpm metadata:pull` / `pnpm metadata:pull:production` |
| CI | Actions → **EAS Metadata Push** → pick `preview` or `production` |

Requires: Expo login or `EXPO_TOKEN`, plus App Store Connect API key in **EAS credentials** (already configured: `M7LGZ9S6S2`).

`apple.version` in `store.config.json` must match an **editable** version in that ASC app (currently `1.0.0` for production). If push fails on version, create the matching version in App Store Connect first.

## What EAS Metadata covers

| In `store.config.json` | Notes |
|------------------------|--------|
| Title, subtitle, description, keywords, promo, release notes | `apple.info.en-US` |
| Privacy / marketing / support URLs | Same block |
| Age rating questionnaire | `apple.advisory` |
| Categories | `apple.categories` |
| Review contact + notes | `apple.review` |
| Release strategy | `apple.release` |
| Copyright | `apple.copyright` |

## What it does **not** cover

| Item | How agents should do it |
|------|-------------------------|
| Paid app **price** / availability | ASC Pricing UI (or ASC API later) |
| App Privacy **nutrition labels** | ASC UI for now |
| **Screenshots** / previews | **Fastlane** — [store-screenshots.md](./store-screenshots.md) (`pnpm screenshots:upload:ios`) |

Do not invent one-off ASC JWT scripts for listing fields when `metadata:push*` works. Screenshots are the Fastlane path, not “wait for a human.”

## Which ASC app?

Three App Store Connect apps — metadata push targets the submit profile’s `ascAppId`:

| Profile | Bundle ID | ASC name | Apple ID |
|---------|-----------|----------|----------|
| `preview` | `com.backgammonmastermind.preview` | Backgammon Mastermind Preview | `6781121420` |
| `production` | `com.backgammonmastermind` | Backgammon Mastermind | `6792138473` |
| *(not used for metadata)* | `com.backgammonmastermind.development` | Backgammon Mastermind Dev | `6780139011` |

See [ios-testing-and-store.md](./ios-testing-and-store.md) for submit / TestFlight wiring.

## Typical edit flow

1. Edit `store.config.json`
2. Commit
3. `pnpm metadata:push:production` (or GHA)
4. Confirm in [App Store Connect](https://appstoreconnect.apple.com/apps/6792138473/appstore)

If you change something in the ASC dashboard that is also in `store.config.json`, run `pnpm metadata:pull:production` and commit so git stays authoritative.

## Related

- Release steps: [releases.md](./releases.md)
- First-time ship checklist: [production-checklist.md](./production-checklist.md)
- Expo schema: https://docs.expo.dev/eas/metadata/schema/
