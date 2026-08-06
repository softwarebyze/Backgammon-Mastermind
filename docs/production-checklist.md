# Production Readiness Checklist

Use this before the first App Store / Play Store submission.

**Ship process:** see **[docs/releases.md](./releases.md)** for TestFlight / version bump / marketing steps.

**Last updated:** v1.0.0 first App Store production push (2026-07-17) — Learn to Play + PostHog.

## CI: what runs on every PR?

| Workflow | Every PR? | Status |
| -------- | --------- | ------ |
| **Lint TS** | Yes | ✅ Required |
| **Type Check (tsc)** | Yes | ✅ Required |
| **Tests (Jest)** | Yes | ✅ Required (59 tests) |
| **EAS Update Preview** | Yes | ✅ (`EXPO_TOKEN` configured) |
| **Expo Doctor** | When deps / native config change | ✅ |
| **Dev Client rebuild** | Native / branding path changes | ✅ |
| **E2E (Maestro)** | Auto on `src/**` / `.maestro/**` changes + every push to `main` | ✅ |
| **Maestro PR screenshots** | When E2E runs on PRs | ✅ (`maestro-screenshots` branch) |

**Recommended:** GitHub branch protection on `main` — require **Lint TS**, **Type Check**, **Tests (jest)**.

## Pre-release engineering

- [x] `pnpm check-all` passes locally
- [x] Game engine + turn-display tests pass
- [x] Maestro smoke E2E passes (GitHub emulator, auto on app changes)
- [ ] **Manual playtest on iPhone** — vs Computer + 2-player, full game to win (turn indicator, settings)
- [x] Settings links wired (GitHub, privacy, terms, share, rate)
- [x] Turn indicator — clear white/black whose-turn UI (PR #23)
- [x] App Store listing draft in `store.config.json` (EAS Metadata)
- [x] Review phone: `+1 954 593 1670` in `store.config.json`
- [x] Set `EXPO_PUBLIC_APP_STORE_ID` in production EAS env — **currently `6780139011` (development ASC app; update when production record exists)**
- [x] Contact email: `zackebenfeld@gmail.com` in app + legal docs

## Versioning & builds

| Step | Status | Action |
| ---- | ------ | ------ |
| 1. Version bump | Done | **v0.1.0** tag + [GitHub Release](https://github.com/softwarebyze/Backgammon-Mastermind/releases/tag/v0.1.0) |
| 2. iOS dev client | Done | [Dev build](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds/79a79243-8e7f-4a44-9c79-af626e9e059f) |
| 3. Device QA | Done | Playtesting complete |
| 4. Preview build (TestFlight) | Done | [iOS preview `2f5c68b0`](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds/2f5c68b0-301e-4c5a-b5cc-7488a88318dd) · [Android preview `aee7ba16`](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds/aee7ba16-f971-436c-9269-040ff718536a) |
| 5. Submit to stores | iOS preview → **`6781121420`** · Android pending | Preview TestFlight: [6781121420](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios) · Dev app: [6780139011](https://appstoreconnect.apple.com/apps/6780139011/testflight/ios) |
| 6. Production build | In progress | iOS `aa0dceb8` + Android `ebe415c4` (EAS production, v1.0.0) |

## Store listing requirements

- [x] App Store listing copy — `store.config.json`
- [x] **App Store Connect API key** — via EAS credentials (`M7LGZ9S6S2`)
- [x] `pnpm metadata:push` — listing synced for **0.1.0** ([ASC app](https://appstoreconnect.apple.com/apps/6780139011/appstore))
- [x] App Store screenshots prepared — `docs/marketing/v1.0.0/app-store-screenshots/` (1320×2868)
- [ ] Upload screenshots in ASC (after production app record exists)
- [ ] Google Play Console app record + screenshots + description
- [x] Privacy policy — hosted at https://backgammon-mastermind.vercel.app/privacy/ (source: `docs/privacy-policy.md` + `public/privacy/`)
- [x] Terms of service — `docs/terms-of-service.md`
- [ ] Pricing — Paid Up Front **$4.99** USD, all territories (set in ASC)
- [ ] Privacy nutrition labels — declare analytics (PostHog product interaction)
- [ ] Content rating questionnaires (both stores)
- [ ] Production ASC app record for `com.backgammonmastermind` (bundle ID registered; create listing + set `ascAppId`)
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
- [x] Set `EXPO_PUBLIC_APP_STORE_ID` (`6780139011` in EAS production env)

## Current status summary

| Item | Status |
| ---- | ------ |
| Core gameplay + prefs UI | Done |
| Turn indicator (white/black clarity) | Done |
| Branding / dev client (SDK 56) | Done |
| Unit tests | Done (59) |
| Maestro E2E + PR screenshot publish | Done |
| Store metadata draft + contact info | Done |
| **iOS submit + metadata push** | Done (TestFlight processing) |
| **App Store screenshots** | **Next — you** |
| **Google Play first upload** | **Next — you** (manual; see below) |
| Production EAS build + App Store review | Not started |

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
| **EAS Update Preview** | Every PR | OTA preview on dev client |

**Repeat release path (after first-time store setup):**

1. Actions → **New App Version** (pick patch/minor/major)
2. That creates a tag → **New GitHub Release** runs
3. Release published → **EAS QA Build** runs automatically
4. After QA on device → Actions → **EAS Production Build**
5. Submit + metadata: today `pnpm submit:preview:ios` + `pnpm metadata:push` locally, or add a workflow once ASC API key is in repo secrets

`eas-build` action already has an `AUTO_SUBMIT` input (not wired yet) — candidate for a follow-up **EAS Submit + Metadata** workflow.

### One-time only (you, first submission)

| Item | Why manual |
| ---- | ---------- |
| **App Store Connect app record** | Apple account / bundle ID registration |
| **ASC API key** → GitHub secret or EAS credentials | Apple issues the key once; then `metadata:push` can automate |
| **Google Play app record** | Play Console signup |
| **Register iPhone** (`eas device:create`) | Device UDID for ad-hoc dev IPA |
| **Screenshots** | Upload in ASC / Play (or script later from `docs/remotion/after/`) |
| **Content rating questionnaires** | Store consoles |
| **`EXPO_PUBLIC_APP_STORE_ID`** | ✅ Set in EAS production (`6780139011`) |

After the ASC API key is configured, **metadata push** and **submit** can move into CI like everything else above.

## Suggested order from here

1. **TestFlight** — wait for Apple processing, then enable internal testers: [ASC TestFlight](https://appstoreconnect.apple.com/apps/6780139011/testflight/ios)
2. **Screenshots** — upload in App Store Connect (use `docs/remotion/after/` or device captures)
3. **Content rating** — complete questionnaires in ASC if not already done via metadata push
4. **Google Play (first time only)** — create app in [Play Console](https://play.google.com/console), then upload first AAB manually:
   ```sh
   pnpm build:production:android   # app-bundle, not preview APK
   ```
   Download the `.aab` from EAS and upload under **Release → Testing → Internal testing**. After that, `pnpm submit:preview:android` / production submit works.
5. **Internal TestFlight QA** → fix issues → **EAS Production Build** → App Store review submit

See also: `docs/ios-testing-and-store.md`
