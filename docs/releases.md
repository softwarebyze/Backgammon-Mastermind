# Releases

How we ship **TestFlight**, **App Store**, and **GitHub** releases.

What’s already shipped: [GitHub Releases](https://github.com/softwarebyze/Backgammon-Mastermind/releases).  
What’s next: [open issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) (look for a `Release: v…` epic if one exists).

First-time store setup: [production-checklist.md](./production-checklist.md).

---

## Quick reference

| Goal | Command / action |
|------|------------------|
| Verify locally | `pnpm check-all` |
| iOS TestFlight binary + submit | Actions → **EAS QA Build** (auto `--auto-submit` on iOS preview) |
| Submit to TestFlight (manual) | `EXPO_PUBLIC_APP_ENV=preview pnpm submit:preview:ios` |
| Push App Store listing (preview TF app) | Actions → **EAS Metadata Push** (`preview`) or `pnpm metadata:push` |
| Push App Store listing (production) | Actions → **EAS Metadata Push** (`production`) or `pnpm metadata:push:production` |
| Marketing renders | **Automatic** on GitHub Release (`Remotion Render (Release Assets)`). Manual: `cd remotion && pnpm render:all` |
| Tag + GitHub Release | Actions → **New App Version** (patch) or manual tag |

---

## Version numbers (keep in sync)

Update **all** of these for each store release:

| File | Field |
|------|--------|
| `package.json` | `"version"` |
| `store.config.json` | `apple.version` |
| App Store Connect | **+ Version** matching `apple.version` |
| Git tag | `v0.1.2` (matches `package.json`) |

Expo native build numbers are managed by EAS (`eas.json` / remote version source).

---

## Release checklist (TestFlight patch, e.g. v0.1.2)

### 1. Code ready

- [ ] `pnpm check-all` passes
- [ ] PR merged to `main` (stack: persistence, animations, compound moves, dice roll — see `docs/roadmap.md`)
- [ ] `docs/evidence/v0.1.x/` updated if UX changed
- [ ] Maestro smoke green on `main` (or local: `maestro test .maestro/app/backgammon-smoke.yaml -e APP_ID=com.backgammonmastermind.development`)

### 2. Bump version

```bash
# Option A — GitHub Actions (recommended)
# Actions → "New App Version" → patch

# Option B — manual
# Edit package.json + store.config.json → commit → tag
git tag v0.1.2 && git push origin v0.1.2
```

### 3. Build preview IPA

```bash
pnpm build:preview:ios
# or: gh workflow run eas-build-qa.yml (with iOS enabled)
```

Wait for EAS build to finish on [expo.dev builds](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds).

### 4. Submit to TestFlight

**Important:** preview builds use bundle `com.backgammonmastermind.preview`. Pass preview env so `eas submit` targets the correct ASC app:

```bash
EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --latest
# or with explicit build id:
EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --id <BUILD_ID>
```

See [ios-testing-and-store.md](./ios-testing-and-store.md) if the build does not appear in App Store Connect (wrong bundle ID).

### 5. Metadata & screenshots

```bash
# After binary is processed in ASC — create version matching apple.version if needed
pnpm metadata:push              # preview ASC 6781121420
pnpm metadata:push:production   # production ASC 6792138473 — prefer this over ad-hoc ASC API calls
```

Prefer **`store.config.json` + `metadata:push*`** for listing fields (privacy/marketing URLs, copy, advisory, review). **Price** is not in EAS Metadata — set once in ASC Pricing UI ($4.99). No one-off API scripts for routine updates.
- App Store screenshots: device captures or `docs/remotion/after/` + `docs/marketing/v0.1.1/`
- TestFlight release notes: paste from GitHub Release or `docs/evidence/v0.1.1/README.md`

### 6. TestFlight QA

1. [App Store Connect → TestFlight (preview app)](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios) — **BackgammonMastermind (d8480c)**, bundle `com.backgammonmastermind.preview`
2. Enable **internal testing** group
3. Smoke test on device: new game, roll (dice animation), compound move, resume, back to home

> **Do not** look for preview builds under [6780139011](https://appstoreconnect.apple.com/apps/6780139011/testflight/ios) — that is the **development** ASC app (`com.backgammonmastermind.development`). Preview uploads sent there fail with error **90055**.

### 7. GitHub Release

- Actions → **New GitHub Release** (on tag) or edit draft
- Attach: `docs/marketing/v0.1.1/*.mp4`, link evidence folder
- List closed issues (#25–#33, #39, etc.)

---

## CI notes

| Check | Expected |
|-------|----------|
| Lint / tsc / jest / knip | Must pass |
| E2E Maestro (Android emulator) | Must pass on app changes |
| **PR Preview / Deploy PR Preview** | May **fail** on Expo free plan when CI/CD minutes exhausted (resets monthly). Not a merge blocker. |
| EAS Update Preview (GitHub) | Uses `EXPO_TOKEN`; separate from Expo workflow minutes |

---

## Marketing assets per release

**Automatic (preferred):** publishing a GitHub Release (tag → [New GitHub Release](../.github/workflows/new-github-release.yml)) triggers [Remotion Render (Release Assets)](../.github/workflows/remotion-render-release.yml). That workflow:

1. Renders `LaunchHero`, `AppStorePreview`, and `FeatureSpotlight` from `remotion/`
2. Writes `docs/remotion/after/*.mp4` and `docs/marketing/v{version}/*.mp4` (+ README)
3. Commits and pushes to `main`

You can also run it manually: Actions → **Remotion Render (Release Assets)** → Run workflow (optional version input).

**Manual (local):**

```bash
# Remotion (hero, App Store preview, social square)
cd remotion && pnpm install && pnpm render:all
cp out/*.mp4 ../docs/remotion/after/
mkdir -p ../docs/marketing/v0.1.3 && cp out/*.mp4 ../docs/marketing/v0.1.3/

# Live app captures (web + iOS simulator)
# See docs/marketing/v0.1.1/README.md
```

> CI uses `--gl=swangle` (no GPU on GitHub runners). Local scripts keep `--gl=angle`. See [Remotion GL options](https://www.remotion.dev/docs/gl-options).

---

## Production (App Store review)

After TestFlight sign-off:

1. Actions → **EAS Production Build** (iOS + Android)
2. Submit production builds via `eas submit` production profiles
3. Complete ASC content rating + review questionnaire (first time only)
4. Promote build to App Store review

Full first-submission checklist: [production-checklist.md](./production-checklist.md).

---

## Related docs

- [ios-testing-and-store.md](./ios-testing-and-store.md) — dev client, TestFlight, metadata
- [production-checklist.md](./production-checklist.md) — first App Store / Play submission
- [docs/evidence/](./evidence/) — before/after QA screenshots
- [docs/remotion/README.md](./remotion/README.md) — video compositions
- [docs/roadmap.md](./roadmap.md) — long-horizon product vision
- [docs/README.md](./README.md) — docs index
