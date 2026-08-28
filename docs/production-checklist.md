# Production Readiness Checklist

Use this before the first App Store / Play Store submission.

**Ship process:** see **[docs/releases.md](./releases.md)** for TestFlight / version bump / marketing steps.

**Last updated:** 2026-08-28 — first production release: PR #150 merged (stable SDK 56), production iOS build auto-submitting, metadata + screenshots pushed.

## CI: what runs on every PR?

| Workflow | Every PR? | Status |
| -------- | --------- | ------ |
| **Lint TS** | Yes | ✅ Required |
| **Type Check (tsc)** | Yes | ✅ Required |
| **Tests (Jest)** | Yes | ✅ Required |
| **Knip** | Yes | ✅ Unused-export check (also in `pnpm check-all`) |
| **EAS Update Preview** | Yes | ✅ (`EXPO_TOKEN` configured) — Expo QR comment only |
| **Expo Doctor** | When deps / native config change | ✅ 21/22 on SDK 56.0.20 — the sole SDK 56 Hermes V1 memory advisory is a narrow, documented release exception; SDK 57 upgrade tracked separately |
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
| 1. Version bump | Done | **v1.0.0** in `package.json` / store metadata |
| 2. iOS dev client | Done | Rebuild when native deps / display name / `CFBundleDisplayName` change (this ship: spaced name) |
| 3. Device QA | Partial | v0.1.x TestFlight done — **re-playtest** the preview binary from this ship |
| 4. Preview build (TestFlight) | Ready to dispatch | Preview ASC **`6781121420`** (`com.backgammonmastermind.preview`) named **Backgammon Mastermind Preview** |
| 5. Submit to stores | iOS TestFlight via preview; production pending | Preview TF: [6781121420](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios) · Prod: [6792138473](https://appstoreconnect.apple.com/apps/6792138473/appstore) |
| 6. Production build | In progress | Rebuilt + auto-submitting from `main` (sdk-56 stable candidate, PR #150 merged) to production ASC `6792138473` |

## Store listing requirements

- [x] App Store listing copy — `store.config.json` (push via EAS Metadata)
- [x] **App Store Connect API key** — via EAS credentials for `eas metadata` / submit
- [x] `pnpm metadata:push` — preview ASC (`6781121420`); generates `store.preview.config.json` with title **Backgammon Mastermind Preview**
- [x] `pnpm metadata:push:production` — production ASC (`6792138473`)
- [x] App Store screenshots matching shipped UI (Learn in app) — 5× iPhone 6.9" (1320×2868) + 5× iPad Pro 13" (2064×2752) uploaded to production `1.0.0` via `Upload Store Screenshots` GHA (Fastlane deliver) — [store-screenshots.md](./store-screenshots.md)
- [ ] Google Play Console app record + screenshots + description
- [x] Privacy policy — https://backgammon-mastermind.vercel.app/privacy/
- [x] Terms of service — hosted `/terms/`
- [x] Pricing — Paid Up Front **$4.99** USD (ASC Pricing UI)
- [x] Marketing / privacy URLs — in store config; sync with metadata push
- [ ] Privacy nutrition labels — declare analytics (PostHog product interaction) in ASC UI
- [x] iOS age rating — via store config → `apple.advisory` + metadata push (4+)
- [ ] Google Play content rating questionnaire
- [x] Production ASC app — `com.backgammonmastermind` / Apple ID `6792138473`
- [x] Export compliance — `ITSAppUsesNonExemptEncryption: false` in `app.config.ts`

## Secrets checklist

| Secret | Required for | Configured? |
| ------ | ------------ | ----------- |
| `EXPO_TOKEN` | EAS preview, QA, production | ✅ |
| App Store Connect API key | `metadata:push` / `metadata:pull` | ✅ (EAS credentials) |
| `MAESTRO_CLOUD_API_KEY` | Maestro Cloud E2E only | Optional |
| `GH_TOKEN` | New App Version workflow | Optional |

## Post-launch

- [ ] **New GitHub Release** workflow after production build is validated
- [ ] Monitor EAS Update channels (`preview`, `production`)

## Current status summary

| Item | Status |
| ---- | ------ |
| Core gameplay + prefs UI | Done |
| Turn indicator (white/black clarity) | Done |
| Learn to Play | **Kept** — praise waits for Continue; horseshoe shows both directions |
| Branding / dev client (SDK 56) | Done — display name **Backgammon Mastermind** (native rebuild) |
| Unit tests | Done (`pnpm test`) |
| Maestro E2E + PR screenshot publish | Done |
| Hosted privacy / terms | Done (#129) |
| Error tracking (PostHog exceptions) | **This ship (slim)** — ErrorBoundary + autocapture + env token + `@posthog/react-native-plugin` (native crashes). Do **not** also install archived `posthog-react-native-session-replay` (CocoaPods `PostHog` ~> 3.58 vs ~> 3.69). `posthog-xcode.sh` is patched so missing `posthog-cli` / CLI token **skips** sourcemap upload instead of failing EAS Run fastlane. Full [#130](https://github.com/softwarebyze/Backgammon-Mastermind/pull/130) dump still deferred |

| Full 17-language i18n | **Not this ship** — [#141](https://github.com/softwarebyze/Backgammon-Mastermind/pull/141) |
| **App Store screenshots** | Done — production 1.0.0 (iPhone 6.9" + iPad 13") via GHA |
| **Google Play first upload** | Create Play app + service account when ready |
| Production binary | Building + auto-submitting from main (SDK 56 stable) |
| Submit for App Review | Blocked on **privacy nutrition labels** (binary + screenshots on ASC) |

## Automation vs one-time setup

Most release steps are **already wired as GitHub Actions** — they use `workflow_dispatch` (or release tags) so you click a button instead of running EAS locally. The **first** App Store / Play submission still needs a few one-time account setup items that cannot be scripted.

### Already automated (Actions tab)

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| **EAS QA Build (Android & IOS) (EAS)** | Manual, or **automatically on GitHub Release** | Preview builds; iOS uses `AUTO_SUBMIT: true` → TestFlight |
| **EAS Submit Preview iOS (TestFlight)** | Manual | Submit latest (or given) preview IPA to TestFlight |
| **EAS Production Build** | Manual | Store binaries (Android + iOS) |
| **New App Version** | Manual (patch/minor/major) | Bump version, tag, push → triggers release flow |
| **New GitHub Release** | Auto on new tag | Draft release notes |
| **E2E (Maestro)** | Auto on `src/**` changes + push to `main` | Smoke test + PR screenshots |
| **EAS Update Preview** | Every PR | OTA preview QR (Expo comment) |
| **EAS Metadata Push** | Manual | Push `store.config.json` (+ generated preview title) |
| **Upload Store Screenshots** | Manual (ios/android) | Fastlane deliver/supply from versioned marketing folder |
| **EAS Submit Production iOS** | Manual | Retry submit of latest (or given) production iOS build |
| **Knip / Expo Doctor / React Doctor** | PR / path filters | Unused exports + dependency health |

**TestFlight trigger (no local EXPO_TOKEN needed for agents):** Actions → **EAS QA Build (Android & IOS) (EAS)** on the merged (or this) branch. Preview iOS auto-submits to ASC `6781121420`. Optionally dispatch **EAS Submit Preview iOS (TestFlight)** if a preview IPA already exists.

**Repeat release path (after first-time store setup):**

1. Actions → **New App Version** (pick patch/minor/major)
2. That creates a tag → **New GitHub Release** runs
3. Release published → **EAS QA Build** runs automatically (`AUTO_SUBMIT` on iOS preview)
4. After QA on device → Actions → **EAS Production Build**
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

### One-time only (you, first submission)

| Item | Why manual |
| ---- | ---------- |
| **App Store Connect app record** | Apple account / bundle ID registration |
| **ASC API key** → EAS credentials | Needed once so `eas metadata` / submit work |
| **Paid app price ($4.99)** | Not in EAS Metadata schema — ASC Pricing UI |
| **Google Play app record** | Play Console signup |
| **Register iPhone** (`eas device:create`) | Device UDID for ad-hoc dev IPA |
| **Privacy nutrition labels** | ASC UI |
| **Screenshots matching final UI** | Upload via `Upload Store Screenshots` GHA (already done for 1.0.0) |

## Suggested order from here

1. ✅ This TestFlight-shareable PR merged (Learn stays; do **not** merge #139 remove-Learn / #141 i18n dump)
2. ✅ Production iOS build + auto-submit dispatched from `main` (`EAS Production Build and Submit (iOS)`)
3. ✅ Production metadata pushed (`metadata:push:production`) + screenshots uploaded (iPhone 6.9" + iPad 13")
4. **Privacy nutrition labels** in ASC (PostHog product interaction) — last App Store gate agents can't fully automate yet
5. Confirm the submitted binary is on ASC → **Submit for App Review** on production `6792138473` / v1.0.0
6. Google Play — Console app + AAB when ready
7. Full PostHog dump (#130 privacy/docs/source-map CI) still deferred; this ship only wires exceptions

See also: [ios-testing-and-store.md](./ios-testing-and-store.md), [eas-metadata.md](./eas-metadata.md), [releases.md](./releases.md)
