# Production Readiness Checklist

Use this before the first App Store / Play Store submission.

**Last updated:** after PR #23 merge (turn indicator + Maestro caption fix on `main`).

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
- [ ] Set `EXPO_PUBLIC_APP_STORE_ID` in production env when App Store record exists
- [x] Contact email: `zackebenfeld@gmail.com` in app + legal docs

## Versioning & builds

| Step | Status | Action |
| ---- | ------ | ------ |
| 1. Version bump | Done | **v0.1.0** on `main` |
| 2. iOS dev client | Done | [Latest dev build](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds/79a79243-8e7f-4a44-9c79-af626e9e059f) — PR #23 JS loads via EAS Update / Metro |
| 3. Device QA | **Next (you)** | Install dev IPA → playtest → fix anything found |
| 4. Preview build (TestFlight) | **Next** | `pnpm build:preview:ios` (+ Android if desired) |
| 5. Submit to stores | Pending | `pnpm submit:preview:ios` then `pnpm metadata:push` |
| 6. Production build | Pending | Actions → **EAS Production Build** after TestFlight QA |

## Store listing requirements

- [x] App Store listing copy — `store.config.json`
- [ ] **App Store Connect API key** — required for `pnpm metadata:push` (create in ASC → Users and Access → Integrations)
- [ ] App Store screenshots (device captures or `docs/remotion/after/`)
- [ ] Google Play Console app record + screenshots + description
- [x] Privacy policy — `docs/privacy-policy.md` (GitHub URL in `store.config.json`)
- [x] Terms of service — `docs/terms-of-service.md`
- [ ] Content rating questionnaires (both stores)
- [x] Export compliance — `ITSAppUsesNonExemptEncryption: false` in `app.config.ts`

## Secrets checklist

| Secret | Required for | Configured? |
| ------ | ------------ | ----------- |
| `EXPO_TOKEN` | EAS preview, QA, production | ✅ |
| App Store Connect API key | `metadata:push` / `metadata:pull` | ❌ **You** — see `docs/ios-testing-and-store.md` |
| `MAESTRO_CLOUD_API_KEY` | Maestro Cloud E2E only | Optional |
| `GH_TOKEN` | New App Version workflow | Optional |

## Post-launch

- [ ] **New GitHub Release** workflow after production build is validated
- [ ] Monitor EAS Update channels (`preview`, `production`)
- [ ] Set `EXPO_PUBLIC_APP_STORE_ID` and verify Rate opens App Store listing on iOS

## Current status summary

| Item | Status |
| ---- | ------ |
| Core gameplay + prefs UI | Done |
| Turn indicator (white/black clarity) | Done |
| Branding / dev client (SDK 56) | Done |
| Unit tests | Done (59) |
| Maestro E2E + PR screenshot publish | Done |
| Store metadata draft + contact info | Done |
| **iPhone playtest** | **Next — you** |
| **TestFlight preview build + submit** | **Next — after playtest** |
| Production EAS build + GitHub release | Not started |

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
| **`EXPO_PUBLIC_APP_STORE_ID`** | Exists only after the app record is created |

After the ASC API key is configured, **metadata push** and **submit** can move into CI like everything else above.

## Suggested order from here

1. **Install dev client** on iPhone ([build link](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds/79a79243-8e7f-4a44-9c79-af626e9e059f)) — open in Safari → Install
2. **Playtest** — full games, settings, turn clarity; `pnpm start` for live JS if needed
3. **`pnpm build:preview:ios`** — TestFlight binary
4. **First time:** Create ASC API key → then `pnpm submit:preview:ios` + `pnpm metadata:push` (or add a GHA workflow)
5. **Upload screenshots** in App Store Connect
6. **Internal TestFlight** → fix issues → **EAS Production Build** → submit

See also: `docs/ios-testing-and-store.md`
