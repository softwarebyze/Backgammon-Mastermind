# Production Readiness Checklist

Use this before the first App Store / Play Store submission.

## CI: what runs on every PR?

| Workflow | Every PR? | Recommendation |
| -------- | --------- | -------------- |
| **Lint TS** | Yes | Keep required |
| **Type Check (tsc)** | Yes | Keep required |
| **Tests (Jest)** | Yes | Keep required |
| **EAS Update Preview** | Yes | Keep (needs `EXPO_TOKEN`) |
| **Expo Doctor** | Only when `package.json` / lockfile changes | Keep as-is (prebuild is slow) |
| **Dev Client rebuild** | Only on native/branding path changes | Keep as-is |
| **E2E (Maestro)** | **No** — label-gated or manual | **Do not** run on every PR (30+ min, emulator cost) |

**Recommended GitHub branch protection** on `main`: require **Lint TS**, **Type Check**, and **Tests (jest)** to pass before merge. Optionally require **Expo Doctor** when you change dependencies often.

To run E2E before a release, add label `android-test-github` (free GitHub emulator) or `android-test-maestro-cloud` (Maestro Cloud, needs `MAESTRO_CLOUD_API_KEY`) on the release PR.

## Pre-release engineering

- [ ] `pnpm check-all` passes locally
- [ ] Game engine tests pass (`src/lib/game/moves.test.ts`)
- [ ] Maestro smoke E2E passes (label a PR or `pnpm e2e-smoke` on device/emulator)
- [ ] Manual playtest: vs Computer and 2-player, full game to win
- [ ] Settings links open (GitHub, privacy, terms, share, rate)
- [ ] Replace placeholder App Store ID in `src/lib/app-links.ts` (`openStoreListing`)
- [ ] Confirm support email in `src/lib/app-links.ts` and legal docs

## Versioning & builds

1. **Bump version** — Actions → **New App Version** → `patch` / `minor` / `major` (needs `GH_TOKEN` or default `GITHUB_TOKEN` with write access)
2. **QA build** — Actions → **EAS QA Build** (preview profile, APK/AAB + iOS) — needs `EXPO_TOKEN`
3. **Install QA build** on real iOS + Android devices; verify splash, icon, gameplay, settings
4. **Production build** — Actions → **EAS Production Build** — needs `EXPO_TOKEN`
5. **Submit** — `eas submit` or EAS Submit from Expo dashboard (`eas.json` submit profiles exist)

## Store listing requirements

- [ ] App Store Connect app record + screenshots + description
- [ ] Google Play Console app record + screenshots + description
- [ ] Privacy policy URL (hosted or GitHub raw link — see `docs/privacy-policy.md`)
- [ ] Terms of service URL (see `docs/terms-of-service.md`)
- [ ] Content rating questionnaires (both stores)
- [ ] Export compliance — `ITSAppUsesNonExemptEncryption: false` already set in `app.config.ts`

## Secrets checklist

| Secret | Required for |
| ------ | ------------ |
| `EXPO_TOKEN` | EAS preview, QA, production builds |
| `MAESTRO_CLOUD_API_KEY` | Maestro Cloud E2E only |
| `GH_TOKEN` | New App Version workflow (optional if default token has contents: write) |

## Post-launch

- [ ] **New GitHub Release** workflow after production build is validated
- [ ] Monitor EAS Update channels (`preview`, `production`) if shipping OTA fixes
- [ ] Update `openStoreListing()` with real Apple App Store ID

## Current gaps (as of v0.0.1)

| Item | Status |
| ---- | ------ |
| Core gameplay | Done |
| Branding / dev client | Done |
| Unit tests (UI kit) | Done |
| Unit tests (game engine) | Added in production-readiness PR |
| E2E smoke (Maestro) | Defined, not run on recent PRs |
| QA / production EAS builds | Workflows exist, never triggered |
| Store submission | Not started |
| GitHub release / tag | None yet |
