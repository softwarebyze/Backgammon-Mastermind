# Releases

How we ship **TestFlight**, **App Store**, and **GitHub** releases for Backgammon Mastermind.

**Current line:** `0.1.x` — **next ship: v0.1.2** ([#63](https://github.com/softwarebyze/Backgammon-Mastermind/issues/63)) — review scrubber polish, opening-roll stability, point numbers. See [production checklist](./production-checklist.md) for first-time store setup.

---

## Quick reference

| Goal | Command / action |
|------|------------------|
| Verify locally | `pnpm check-all` |
| iOS TestFlight binary + submit | Actions → **EAS QA Build** (auto `--auto-submit` on iOS preview) |
| Submit to TestFlight (manual) | `EXPO_PUBLIC_APP_ENV=preview pnpm submit:preview:ios` |
| Push App Store listing | Actions → **EAS Metadata Push** or `pnpm metadata:push` (targets **preview** ASC app) |
| Marketing renders | `cd remotion && pnpm render:all` → copy to `docs/remotion/after/` |
| Tag + GitHub Release | Actions → **New App Version** (patch) or manual tag |

---

## Version numbers (keep in sync)

Update **all** of these for each store release:

| File | Field |
|------|--------|
| `package.json` | `"version"` |
| `store.config.json` | `apple.version` |
| App Store Connect | **+ Version** matching `apple.version` |
| Git tag | `v0.1.1` (matches `package.json`) |

Expo native build numbers are managed by EAS (`eas.json` / remote version source).

---

## Release checklist (TestFlight patch, e.g. v0.1.1)

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
git tag v0.1.1 && git push origin v0.1.1
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
# After binary is processed in ASC — create version 0.1.1 in ASC if needed
pnpm metadata:push   # uses preview submit profile → ASC app 6781121420
```

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

```bash
# Remotion (hero, App Store preview, social square)
cd remotion && pnpm install && pnpm render:all
cp remotion/out/*.mp4 ../docs/remotion/after/
cp remotion/out/*.mp4 ../docs/marketing/v0.1.1/   # after creating folder

# Live app captures (web + iOS simulator)
# See docs/marketing/v0.1.1/README.md
```

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
- [docs/roadmap.md](./roadmap.md) — milestone status
