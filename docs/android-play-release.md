# Android Play release

Canonical how-to for shipping **Google Play** (production track) for Backgammon Mastermind. Mirrors [ios-testing-and-store.md](./ios-testing-and-store.md) for the Android side.

**Do not** put service-account JSON, private keys, or token values in this file or in PRs. Secret **names** only — inventory lives on [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160).

First-time store checklist: [production-checklist.md](./production-checklist.md).  
Track A gates: [release-gates.md](./release-gates.md).

---

## Package & EAS profiles

| EAS env | Android package | Build profile | Submit profile | Artifact |
|---------|-----------------|---------------|----------------|----------|
| `production` | `com.backgammonmastermind` | `production` (AAB) | `production` | Store / Play production track |
| `preview` | `com.backgammonmastermind.preview` | `preview` (APK) | `preview` (no Play key wired) | Internal / QA only |
| `development` | `com.backgammonmastermind.development` | `development` | — | Dev client |

Play Console production app package: **`com.backgammonmastermind`**.

`eas.json` production Android submit:

- `serviceAccountKeyPath`: `@secret:GOOGLE_SERVICE_ACCOUNT` (EAS secret)
- `track`: `production`
- `releaseStatus`: `completed`

Always pass matching env when submitting:

```sh
EXPO_PUBLIC_APP_ENV=production eas submit --platform android --profile production --latest
# or:
pnpm submit:production:android
```

---

## One-time Play Console setup

Do these once before the first upload (human / Console UI):

1. Create the Play Console app with package **`com.backgammonmastermind`**.
2. Complete **content rating** and required declarations.
3. Google Cloud → service account + JSON key → grant Play **Release to production** (or the least privilege that covers listing + release for this app).
4. Store the same JSON in **two** places (they are separate systems):

| Where | Secret name | Used by |
|-------|-------------|---------|
| **EAS** project secret | `GOOGLE_SERVICE_ACCOUNT` | `eas submit` / Actions **EAS Production Build and Submit (Android)** (`@secret:GOOGLE_SERVICE_ACCOUNT`) |
| **GitHub** Actions secret | `GOOGLE_SERVICE_ACCOUNT_BASE64` | Fastlane `supply` via **Upload Store Screenshots** (android) |

Also needed for EAS Actions: repo secret `EXPO_TOKEN`.

Do **not** commit the JSON key. Do **not** paste key material into issues or docs.

---

## Screenshots & listing (Fastlane)

Source of truth and prepare/upload commands: **[store-screenshots.md](./store-screenshots.md)**.

| Asset | Path |
|-------|------|
| Play phone screenshots (committed 9:16 crop) | `fastlane/metadata/android/en-US/images/phoneScreenshots/` |
| Listing text (title, short/full description) | `fastlane/metadata/android/en-US/*.txt` |
| Contact / default language | `fastlane/metadata/android/contact_*.txt`, `default_language.txt` |

EAS Metadata (`store.config.json`) is **App Store only**. Play listing text + phone screenshots go through Fastlane `supply` (`fastlane android screenshots`).

### Preferred (CI)

1. Confirm screenshots are staged under `fastlane/metadata/android/en-US/images/phoneScreenshots/` (re-run `pnpm screenshots:prepare` after recapture).
2. Actions → **Upload Store Screenshots** → platform **`android`**.
3. Confirm in Play Console → store listing.

### Local

```sh
export PLAY_JSON_KEY_PATH=/path/to/google-service-account.json   # local path only; never commit
export PLAY_PACKAGE_NAME=com.backgammonmastermind
pnpm screenshots:upload:android
```

---

## Build & submit (production Android)

### Preferred (CI — build + auto-submit)

Actions → **EAS Production Build and Submit (Android)**  
Workflow: [`.github/workflows/eas-build-prod-android.yml`](../.github/workflows/eas-build-prod-android.yml)

What it runs (conceptually):

```sh
EXPO_PUBLIC_APP_ENV=production eas build \
  --platform android \
  --profile production \
  --non-interactive \
  --no-wait \
  --auto-submit \
  --message "Build production (Android)"
```

Requires: `EXPO_TOKEN` (GitHub) + `GOOGLE_SERVICE_ACCOUNT` (EAS).

Only dispatch when Play Console + secrets are ready. Do **not** start this from a docs-only PR ([release-gates.md](./release-gates.md)).

### Manual / retry submit

```sh
# Build AAB only
pnpm build:production:android
# or: EXPO_PUBLIC_APP_ENV=production eas build --profile production --platform android

# After build finishes
EXPO_PUBLIC_APP_ENV=production eas submit --platform android --profile production --latest
# or with build id:
EXPO_PUBLIC_APP_ENV=production eas submit --platform android --profile production --id <BUILD_ID>
```

There is also Actions → **EAS Production Build** (iOS + Android binaries without the Android-only auto-submit workflow). For Play, prefer the dedicated Android workflow above when you want build+submit in one click.

---

## Status watch

After dispatch / submit:

1. **EAS build** — [expo.dev builds](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds) until finished (AAB).
2. **EAS submit** — same build page / submit logs; failures are usually missing/invalid `GOOGLE_SERVICE_ACCOUNT` or Play Console app not ready.
3. **Play Console** — Production (or the track configured in `eas.json`) → confirm the new version / rollout. With `releaseStatus: completed`, EAS aims to complete the production release rather than leave a draft-only upload — still verify in Console.
4. **GitHub Actions** — workflow run for **EAS Production Build and Submit (Android)** and, separately, **Upload Store Screenshots** if you refreshed listing assets.

Ship tracking for the first Play upload: [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160).

---

## Quick reference

| Goal | Action |
|------|--------|
| Upload Play screenshots + listing text | Actions → **Upload Store Screenshots** → `android` |
| Build AAB + auto-submit to Play | Actions → **EAS Production Build and Submit (Android)** |
| Submit latest production AAB only | `pnpm submit:production:android` |
| Local screenshot upload | `PLAY_JSON_KEY_PATH=… pnpm screenshots:upload:android` |

---

## Related

- [store-screenshots.md](./store-screenshots.md) — Fastlane paths and Play 9:16 crop notes
- [releases.md](./releases.md) — overall release flow
- [production-checklist.md](./production-checklist.md) — first App Store / Play submission
- [release-gates.md](./release-gates.md) — Track A (Play) vs Track B
- [ios-testing-and-store.md](./ios-testing-and-store.md) — iOS / TestFlight counterpart
- [eas-metadata.md](./eas-metadata.md) — App Store listing only (not Play)
