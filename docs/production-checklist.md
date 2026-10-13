# Production Readiness Checklist

> **Status: first submission is long done.** The app has been live on the App Store since v1.0.0 (2026-07-17) and is currently at **v1.1.0** (shipped 2026-10-10); Google Play upload landed in #160. This doc now serves as the **standing readiness checklist for each production release** plus the record of one-time setup. For repeat releases use **[releases.md](./releases.md)**; for what may ship when use **[release-gates.md](./release-gates.md)** (CI is the automated bar; the human gates are device smoke, version sync, and owner sign-off).

**Last updated:** 2026-10-12 — v1.1.0 shipped to the App Store (build 14) on 2026-10-10; SDK 57; 17 locales live; Play upload working (internal track by default, #255).

## CI: what runs on every PR?

| Workflow | Every PR? | Status |
| -------- | --------- | ------ |
| **Lint TS** | Yes | ✅ Required |
| **Type Check (tsc)** | Yes | ✅ Required |
| **Tests (Jest)** | Yes | ✅ Required |
| **Knip** | Yes | ✅ Unused-export check (also in `pnpm check-all`) |
| **EAS Update Preview** | Yes | ✅ (`EXPO_TOKEN` configured) — Expo QR comment only |
| **Expo Doctor** | When deps / native config change | ✅ SDK 57 (upgrade shipped in #157) |
| **React Doctor** | Advisory | ✅ |
| **Dev Client rebuild** | Native / branding path changes | ✅ |
| **E2E (Maestro)** | Auto on `src/**` / `.maestro/**` changes + every push to `main` | ✅ |
| **Maestro PR screenshots** | When E2E runs on PRs | ✅ |

**Local gate:** `pnpm check-all` = lint + type-check + translation lint + Jest + knip.

**Recommended:** GitHub branch protection on `main` — require **Lint TS**, **Type Check**, **Tests (jest)**.

## Pre-release engineering

- [x] `pnpm check-all` passes locally
- [x] Game engine + turn-display tests pass
- [x] Maestro smoke E2E passes (GitHub emulator, auto on app changes)
- [ ] **Manual playtest on iPhone** — latest **preview** binary: vs Computer + 2-player, full game to win, Resume, Learn to Play
- [x] Settings links wired (GitHub, privacy, terms, share, rate)
- [x] Turn indicator — clear white/black whose-turn UI (PR #23)
- [x] App Store listing source — `store.config.json` (EAS Metadata)
- [x] Review phone: `+1 954 593 1670` in store config
- [x] `EXPO_PUBLIC_APP_STORE_ID` in EAS **production** env = **`6792138473`**
- [x] Contact email: `zackebenfeld@gmail.com` in app + legal docs
- [x] Hosted privacy / terms — https://backgammon-mastermind.vercel.app/privacy/ + `/terms/` (PR #129)

## Versioning & builds

| Step | Status | Action |
| ---- | ------ | ------ |
| 1. Version bump | Done | **v1.1.0** in `package.json` / `store.config.json` (matches live ASC; EAS build numbers stay remote) |
| 2. iOS dev client | Done | Rebuild when native deps / display name / `CFBundleDisplayName` change |
| 3. Device QA | Per release | Device smoke on the release build before promoting — see [release-gates.md](./release-gates.md) |
| 4. Preview build (TestFlight) | Per release | Preview ASC **`6781121420`** (`com.backgammonmastermind.preview`) named **Backgammon Mastermind Preview** |
| 5. Submit to stores | Per release | Preview TF: [6781121420](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios) · Prod: [6792138473](https://appstoreconnect.apple.com/apps/6792138473/appstore) |
| 6. Production build | Done (1.1.0) | **EAS Production Build and Submit (iOS)** / **(Android)** from `main` → production ASC `6792138473`. ⚠️ The release-triggered **EAS QA Build** failed on the v1.1.0 release (iOS distribution certificate not validated for non-interactive builds) — fix credentials before the next release. |

## Store listing requirements

- [x] App Store listing copy — `store.config.json` (push via EAS Metadata)
- [x] **App Store Connect API key** — via EAS credentials for `eas metadata` / submit
- [x] `pnpm metadata:push` — preview ASC (`6781121420`); generates `store.preview.config.json` with title **Backgammon Mastermind Preview**
- [x] `pnpm metadata:push:production` — production ASC (`6792138473`)
- [x] App Store screenshots matching shipped UI (Learn in app) — 5× iPhone 6.9" (1320×2868) + 5× iPad Pro 13" (2064×2752) uploaded via `Upload Store Screenshots` GHA (Fastlane deliver) — [store-screenshots.md](./store-screenshots.md); 17 locales complete as of v1.1.0 (iMessage-app shots pending in #258)
- [x] Google Play Console app record + screenshots + description — first upload landed (#160, 2026-10-09); CI submits to the **internal** track by default (#255), listing text staged in `fastlane/metadata/android/`
- [x] Privacy policy — https://backgammon-mastermind.vercel.app/privacy/
- [x] Terms of service — hosted `/terms/`
- [x] Pricing — Paid Up Front **$4.99** USD (ASC Pricing UI)
- [x] Marketing / privacy URLs — in store config; sync with metadata push
- [x] Privacy nutrition labels — declared in ASC UI (required to pass review; app live since v1.0.0) — confirm PostHog product-interaction label is still accurate after #240
- [x] iOS age rating — via store config → `apple.advisory` + metadata push (4+)
- [x] Google Play content rating questionnaire — required for the #160 Play upload
- [x] Production ASC app — `com.backgammonmastermind` / Apple ID `6792138473`
- [x] Export compliance — `ITSAppUsesNonExemptEncryption: false` in `app.config.ts`

## Secrets checklist

| Secret | Required for | Configured? |
| ------ | ------------ | ----------- |
| `EXPO_TOKEN` | EAS preview, QA, production | ✅ |
| App Store Connect API key | `metadata:push` / `metadata:pull` | ✅ (EAS credentials) |
| `MAESTRO_CLOUD_API_KEY` | Maestro Cloud E2E — **not used**; the Cloud workflow is disabled (`e2e-android-maestro.yml.disabled`), E2E runs on the GitHub emulator | Not needed |
| `GH_TOKEN` | New App Version workflow | Optional |
| `GOOGLE_SERVICE_ACCOUNT_BASE64` (GH secret) | Fastlane supply — Android screenshots + listing text | See [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160) (GH vs EAS are separate) |
| `GOOGLE_SERVICE_ACCOUNT` (EAS secret) | EAS submit — Android AAB → Google Play | See [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160) |

## Post-launch

- [x] **New GitHub Release** workflow after production build is validated (every tag incl. v1.1.0 has one)
- [ ] Monitor EAS Update channels (`preview`, `production`)

## Current status summary (as of v1.1.0, 2026-10-10)

| Item | Status |
| ---- | ------ |
| Core gameplay + prefs UI | Done |
| Turn indicator (white/black clarity) | Done |
| Learn to Play | Kept and shipped — praise waits for Continue; horseshoe shows both directions |
| Branding / dev client (SDK 57) | Done — display name **Backgammon Mastermind** |
| Unit tests | Done (`pnpm test`) |
| Maestro E2E + PR screenshot publish | Done |
| Hosted privacy / terms | Done (#129) |
| Error tracking (PostHog exceptions) | Done — ErrorBoundary + autocapture + native crash plugin; sourcemaps upload fixed in #240. Session replay / full dump (#130) still deferred |
| 17-language i18n | Shipped (v1.0.2+); remaining polish tracked in #140, #244, #245 |
| App Store screenshots | Done — iPhone 6.9" + iPad 13", all 17 locales |
| Google Play first upload | Done (#160) — internal track by default (#255) |
| Production binary | v1.1.0 live (App Store build 14, 2026-10-10) |
| Open follow-ups | iOS EAS credentials for release-triggered QA builds (see Versioning table); iMessage store screenshots (#258); Play production promotion not verified |

## Automation vs one-time setup

Most release steps are **already wired as GitHub Actions** — they use `workflow_dispatch` (or release tags) so you click a button instead of running EAS locally. One-time store setup is **done** (both stores live); the remaining one-off items are recorded under "One-time only" below for reference.

### Already automated (Actions tab)

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| **EAS QA Build (Android & IOS) (EAS)** | Manual, or **automatically on GitHub Release** | Preview builds; iOS uses `AUTO_SUBMIT: true` → TestFlight |
| **EAS Submit Preview iOS (TestFlight)** | Manual | Submit latest (or given) preview IPA to TestFlight |
| **EAS Production Build and Submit (iOS)** | Manual | Store binary + auto-submit to App Store Connect |
| **New App Version** | Manual (patch/minor/major) | Bump version, tag, push → triggers release flow |
| **New GitHub Release** | Auto on new tag | Draft release notes |
| **E2E (Maestro)** | Auto on `src/**` changes + push to `main` | Smoke test + PR screenshots |
| **EAS Update Preview** | Every PR | OTA preview QR (Expo comment) |
| **EAS Metadata Push** | Manual | Push `store.config.json` (+ generated preview title) |
| **Upload Store Screenshots** | Manual (ios/android) | Fastlane deliver (iOS ASC key via EAS) / supply (Play key via `GOOGLE_SERVICE_ACCOUNT_BASE64`) |
| **EAS Submit Production iOS** | Manual | Retry submit of latest (or given) production iOS build |
| **EAS Production Build and Submit (Android)** | Manual | Build AAB + auto-submit to Google Play (`track` input: internal by default, production selectable) |
| **Knip / Expo Doctor / React Doctor** | PR / path filters | Unused exports + dependency health |

**TestFlight trigger (no local EXPO_TOKEN needed for agents):** Actions → **EAS QA Build (Android & IOS) (EAS)** on the merged (or this) branch. Preview iOS auto-submits to ASC `6781121420`. Optionally dispatch **EAS Submit Preview iOS (TestFlight)** if a preview IPA already exists.

**Repeat release path (after first-time store setup):**

1. Actions → **New App Version** (pick patch/minor/major)
2. That creates a tag → **New GitHub Release** runs
3. Release published → **EAS QA Build** runs automatically (`AUTO_SUBMIT` on iOS preview)
4. After QA on device → Actions → **EAS Production Build and Submit (iOS)** / **(Android)**
5. Metadata: Actions → **EAS Metadata Push** (`preview` or `production`)
6. Submit production: `pnpm submit:production:ios` (sets `EXPO_PUBLIC_APP_ENV=production` — do not rely on a development `.env`)

### Listing updates — preferred path

Full how-to: [eas-metadata.md](./eas-metadata.md).

| Change | How |
| ------ | --- |
| Description, keywords, URLs, review notes, age advisory | Edit `store.config.json` → `pnpm metadata:push:production` (or GHA) |
| Preview TestFlight **app name** | `pnpm metadata:push` regenerates `store.preview.config.json` as **Backgammon Mastermind Preview** |
| Price / availability | ASC **Pricing and Availability** UI |
| Privacy nutrition labels | ASC UI |
| iOS screenshots | Fastlane (`pnpm screenshots:upload:ios`) or EAS Metadata `APP_IPHONE_67` ([store-screenshots.md](./store-screenshots.md)) |
| Android screenshots | Fastlane / Play Console |

Avoid one-off App Store Connect API / JWT scripts for shipping.

### One-time only (already done — kept for reference)

| Item | Why manual |
| ---- | ---------- |
| **App Store Connect app record** | Apple account / bundle ID registration |
| **ASC API key** → EAS credentials | Needed once so `eas metadata` / submit work |
| **Paid app price ($4.99)** | Not in EAS Metadata schema — ASC Pricing UI |
| **Google Play app record** | Play Console signup |
| **Register iPhone** (`eas device:create`) | Device UDID for ad-hoc dev IPA |
| **Privacy nutrition labels** | ASC UI |
| **Screenshots matching final UI** | Upload via `Upload Store Screenshots` GHA (already done for 1.0.0) |

## Open follow-ups (as of 2026-10-12)

The first submission list above is historical — everything in it shipped. Remaining work:

1. **Fix iOS EAS credentials** — the release-triggered **EAS QA Build** failed on the v1.1.0 release ("Distribution Certificate is not validated for non-interactive builds"). Every future release auto-fires this workflow, so fix before cutting v1.1.1.
2. **iMessage-app store screenshots** (#258, open) — ASC needed these for the 1.1.0 review; images uploaded manually, PR pending.
3. **Google Play production promotion** — CI defaults to the internal track (#255). Verify whether 1.1.0 is (or should be) promoted to Play production.
4. Full PostHog dump (#130 privacy/docs/source-map CI) still deferred; sourcemap upload itself landed in #240.

See also: [ios-testing-and-store.md](./ios-testing-and-store.md), [eas-metadata.md](./eas-metadata.md), [releases.md](./releases.md)
