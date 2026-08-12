# Production Readiness Checklist

Use this before the first App Store / Play Store submission.

**Ship process:** see **[docs/releases.md](./releases.md)** for TestFlight / version bump / marketing steps.

**Last updated:** 2026-08-12 — v1.0.0 App Review push (Learn removed; full i18n + store locales in flight).

## CI: what runs on every PR?

| Workflow | Every PR? | Status |
| -------- | --------- | ------ |
| **Lint TS** | Yes | ✅ Required |
| **Type Check (tsc)** | Yes | ✅ Required |
| **Tests (Jest)** | Yes | ✅ Required |
| **EAS Update Preview** | Yes | ✅ (`EXPO_TOKEN` configured) — Expo QR comment only |
| **Expo Doctor** | When deps / native config change | ✅ |
| **Dev Client rebuild** | Native / branding path changes | ✅ |
| **E2E (Maestro)** | Auto on `src/**` / `.maestro/**` changes + every push to `main` | ✅ |
| **Maestro PR screenshots** | When E2E runs on PRs | ✅ |

**Recommended:** GitHub branch protection on `main` — require **Lint TS**, **Type Check**, **Tests (jest)**.

## Pre-release engineering

- [x] `pnpm check-all` passes locally
- [x] Game engine + turn-display tests pass
- [x] Maestro smoke E2E passes (GitHub emulator, auto on app changes)
- [ ] **Manual playtest on iPhone** — production (or latest preview) binary: vs Computer + 2-player, full game to win
- [x] Settings links wired (GitHub, privacy, terms, share, rate)
- [x] Turn indicator — clear white/black whose-turn UI (PR #23)
- [x] App Store listing source — `store.config.js` + `store/locales/` (EAS Metadata)
- [x] Review phone: `+1 954 593 1670` in store config / locales
- [x] `EXPO_PUBLIC_APP_STORE_ID` in EAS **production** env = **`6792138473`** (verified 2026-08-12)
- [x] Contact email: `zackebenfeld@gmail.com` in app + legal docs
- [x] Hosted privacy / terms — https://backgammon-mastermind.vercel.app/privacy/ + `/terms/` (PR #129)

## Versioning & builds

| Step | Status | Action |
| ---- | ------ | ------ |
| 1. Version bump | Done | **v1.0.0** in `package.json` / store metadata |
| 2. iOS dev client | Done | Rebuild when native deps / `CFBundleLocalizations` / display name change |
| 3. Device QA | Partial | v0.1.x TestFlight done — **re-playtest** the binary you submit |
| 4. Preview build (TestFlight) | Done | Preview ASC **`6781121420`** (`com.backgammonmastermind.preview`) |
| 5. Submit to stores | iOS pending review gates · Android pending | Preview TF: [6781121420](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios) · Prod: [6792138473](https://appstoreconnect.apple.com/apps/6792138473/appstore) |
| 6. Production build | Stale IPA on ASC | Rebuild from current `main` after Learn removal / i18n / display-name land — July binaries are outdated |

## Store listing requirements

- [x] App Store listing copy — `store.config.js` + `store/locales/` (push via EAS Metadata)
- [x] **App Store Connect API key** — via EAS credentials for `eas metadata` / submit
- [x] `pnpm metadata:push` — preview ASC (`6781121420`)
- [x] `pnpm metadata:push:production` — production ASC (`6792138473`) — **re-run after #139/#141**
- [ ] App Store screenshots matching shipped UI — recapture after Learn removal; prefer EAS Metadata `APP_IPHONE_67` ([store-screenshots.md](./store-screenshots.md)); Fastlane = fallback / Play
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
| Branding / dev client (SDK 56) | Done |
| Unit tests | Done |
| Maestro E2E + PR screenshot publish | Done |
| Hosted privacy / terms | Done (#129) |
| Learn removed from v1 | Open [#139](https://github.com/softwarebyze/Backgammon-Mastermind/pull/139) |
| Full in-app + ASC locales | Open [#141](https://github.com/softwarebyze/Backgammon-Mastermind/pull/141) (stacked on #139) |
| **App Store screenshots** | Recapture needed after Learn removal |
| **Google Play first upload** | Create Play app + service account |
| Production binary | Rebuild after merge stack; then submit |
| Submit for App Review | Blocked on **privacy nutrition labels** + fresh binary/screenshots |

## Automation vs one-time setup

Most release steps are **already wired as GitHub Actions** — they use `workflow_dispatch` (or release tags) so you click a button instead of running EAS locally. The **first** App Store / Play submission still needs a few one-time account setup items that cannot be scripted.

### Already automated (Actions tab)

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| **EAS QA Build** | Manual, or **automatically on GitHub Release** | Preview builds (Android + iOS) |
| **EAS Production Build** | Manual | Store binaries (Android + iOS) |
| **New App Version** | Manual (patch/minor/major) | Bump version, tag, push → triggers release flow |
| **New GitHub Release** | Auto on new tag | Draft release notes |
| **E2E (Maestro)** | Auto on `src/**` changes + push to `main` | Smoke test + PR screenshots |
| **EAS Update Preview** | Every PR | OTA preview QR (Expo comment) |
| **EAS Metadata Push** | Manual | Push `store.config.js` + locales |

**Repeat release path (after first-time store setup):**

1. Actions → **New App Version** (pick patch/minor/major)
2. That creates a tag → **New GitHub Release** runs
3. Release published → **EAS QA Build** runs automatically
4. After QA on device → Actions → **EAS Production Build**
5. Metadata: Actions → **EAS Metadata Push** (`preview` or `production`)
6. Submit production: `pnpm submit:production:ios` (sets `EXPO_PUBLIC_APP_ENV=production` — do not rely on a development `.env`)

### Listing updates — preferred path

Full how-to: [eas-metadata.md](./eas-metadata.md).

| Change | How |
| ------ | --- |
| Description, keywords, URLs, review notes, age advisory | Edit `store.config.js` + `store/locales/` → `pnpm metadata:push:production` (or GHA) |
| Price / availability | ASC **Pricing and Availability** UI |
| Privacy nutrition labels | ASC UI |
| iOS screenshots | Prefer EAS Metadata `apple.info.*.screenshots.APP_IPHONE_67`; Fastlane fallback ([store-screenshots.md](./store-screenshots.md)) |
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
| **Screenshots matching final UI** | Capture on device/sim; upload via metadata or Fastlane |

## Suggested order from here

1. Merge ship PRs: [#135](https://github.com/softwarebyze/Backgammon-Mastermind/pull/135) (CI comment) → [#139](https://github.com/softwarebyze/Backgammon-Mastermind/pull/139) (remove Learn) → [#141](https://github.com/softwarebyze/Backgammon-Mastermind/pull/141) (i18n/store) → polish PRs ([#143](https://github.com/softwarebyze/Backgammon-Mastermind/pull/143)/[#145](https://github.com/softwarebyze/Backgammon-Mastermind/pull/145)/[#147](https://github.com/softwarebyze/Backgammon-Mastermind/pull/147))
2. Close [#137](https://github.com/softwarebyze/Backgammon-Mastermind/pull/137) as superseded by #141 Preview title handling
3. **Privacy nutrition labels** in ASC (PostHog product interaction)
4. Recapture screenshots → `pnpm metadata:push:production`
5. **Rebuild + submit** production iOS (`6792138473`)
6. Manual playtest on that binary
7. Google Play — Console app + AAB when ready
8. Defer [#130](https://github.com/softwarebyze/Backgammon-Mastermind/pull/130) (session replay) until nutrition labels cover it

See also: [ios-testing-and-store.md](./ios-testing-and-store.md), [eas-metadata.md](./eas-metadata.md)
