# Production Readiness Checklist

Use this before the first App Store / Play Store submission.

**Last updated:** after PR #15 merge (Maestro E2E + Expo Doctor green on `main`).

## CI: what runs on every PR?

| Workflow | Every PR? | Status |
| -------- | --------- | ------ |
| **Lint TS** | Yes | ✅ Required |
| **Type Check (tsc)** | Yes | ✅ Required |
| **Tests (Jest)** | Yes | ✅ Required |
| **EAS Update Preview** | Yes | ✅ (`EXPO_TOKEN` configured) |
| **Expo Doctor** | When deps / native config change | ✅ |
| **Dev Client rebuild** | Native / branding path changes | ✅ |
| **E2E (Maestro)** | Auto on `src/**` / `.maestro/**` changes + every push to `main` | ✅ |

**Recommended:** GitHub branch protection on `main` — require **Lint TS**, **Type Check**, **Tests (jest)**.

## Pre-release engineering

- [x] `pnpm check-all` passes locally
- [x] Game engine tests pass (`src/lib/game/moves.test.ts`)
- [x] Maestro smoke E2E passes (GitHub emulator, label `android-test-github`)
- [ ] Manual playtest on **QA build** — vs Computer and 2-player, full game to win
- [x] Settings links wired (GitHub, privacy, terms, share, rate)
- [x] App Store listing draft in `store.config.json` (EAS Metadata)
- [x] Set real phone in `store.config.json` → `apple.review.phone` (`+1 954 593 1670`)
- [ ] Set `EXPO_PUBLIC_APP_STORE_ID` in production env when App Store record exists
- [x] Contact email: `zackebenfeld@gmail.com` in app + legal docs

## Versioning & builds

| Step | Status | Action |
| ---- | ------ | ------ |
| 1. Version bump | Done | **v0.1.0** on `main` |
| 2. QA build | **Next** | Actions → **EAS QA Build** (Android + iOS) |
| 3. Device QA | **Next (iOS)** | Install iOS dev client — `docs/ios-testing-and-store.md` |
| 4. Production build | Pending | Actions → **EAS Production Build** |
| 5. Submit | Pending | `eas submit` or Expo dashboard |

## Store listing requirements (manual — you)

- [x] App Store listing copy draft — `store.config.json` (+ `pnpm metadata:push` after first binary)
- [ ] App Store screenshots (use `docs/remotion/after/` or device captures)
- [ ] Google Play Console app record + screenshots + description
- [ ] Privacy policy URL — `docs/privacy-policy.md` (or hosted copy)
- [ ] Terms of service URL — `docs/terms-of-service.md`
- [ ] Content rating questionnaires (both stores)
- [x] Export compliance — `ITSAppUsesNonExemptEncryption: false` in `app.config.ts`

## Secrets checklist

| Secret | Required for | Configured? |
| ------ | ------------ | ----------- |
| `EXPO_TOKEN` | EAS preview, QA, production | ✅ (previews work) |
| `MAESTRO_CLOUD_API_KEY` | Maestro Cloud E2E only | Optional |
| `GH_TOKEN` | New App Version workflow | Optional (default token may suffice) |

## Post-launch

- [ ] **New GitHub Release** workflow after production build is validated
- [ ] Monitor EAS Update channels (`preview`, `production`)
- [ ] Set `EXPO_PUBLIC_APP_STORE_ID` and verify Rate opens App Store listing on iOS

## Current status summary

| Item | Status |
| ---- | ------ |
| Core gameplay + prefs UI | Done |
| Branding / dev client | Done |
| Unit tests (UI + game engine) | Done (53 tests) |
| Maestro E2E (GitHub emulator) | Done |
| Expo SDK 56 deps aligned | Done |
| QA / production EAS builds | **Next — trigger QA build** |
| Store submission | Not started |
| GitHub release / tag | None yet |
