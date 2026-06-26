# iOS testing & App Store (EAS Metadata)

## Contact email

Store listings, privacy policy, and in-app Support use **zackebenfeld@gmail.com** (personal account).

Before `eas metadata:push`, confirm `store.config.json` → `apple.review.phone` is correct (currently **+1 954 593 1670**).

## iOS testing paths

| Path | Best for | Command |
| ---- | -------- | ------- |
| **Dev client** (recommended) | Daily testing on your iPhone with OTA JS updates | `pnpm build:development:ios` |
| **TestFlight** | Beta testers, pre-release QA | `pnpm build:preview:ios` then `eas submit --platform ios --profile preview` |
| **Simulator** | CI / quick UI checks | `eas build --profile simulator --platform ios` |

### Dev client (your iPhone)

1. Register device (once): `eas device:create` or [Expo Devices](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/devices)
2. Build: `pnpm build:development:ios` (or GitHub Actions → **EAS QA Build** with iOS enabled)
3. Install the IPA from the EAS build page (open link in Safari on the device)
4. Start Metro: `pnpm start` — app loads JS from your machine or EAS Update on PRs

### TestFlight

1. Build preview IPA: `pnpm build:preview:ios`
2. Submit: `eas submit --platform ios --profile preview --latest`
3. After Apple processes the build, enable TestFlight testers in App Store Connect

## EAS Metadata (App Store listing)

Listing copy lives in **`store.config.json`** at the repo root. EAS Metadata is **Apple App Store only** (beta).

Set `apple.version` in `store.config.json` to match the editable App Store Connect version (e.g. `"0.1.0"`). Without it, EAS defaults to `1.0` and `metadata:push` fails with a missing `versionString` error.

```sh
# After first binary is in App Store Connect (preview app 6781121420):
pnpm metadata:pull    # optional — import existing ASC listing
pnpm metadata:push    # push store.config.json to preview ASC app
```

If `metadata:push` fails on version info, create version **0.1.0** in App Store Connect (App → iOS App → **+** Version) so it matches your binary and `store.config.json`.

If `metadata:push` fails with *app name already used*, the development ASC app (`6780139011`) already owns **Backgammon Mastermind**. Preview metadata still updates version, categories, age rating, and review notes — only the localized **title** sync fails until you rename one of the ASC apps or ship production.

**Submit the right build to the right ASC app:** Three separate App Store Connect records — do not mix them up.

| EAS env | Bundle ID | ASC app name | Apple ID (`ascAppId`) | TestFlight builds |
|---------|-----------|--------------|----------------------|-------------------|
| `development` | `com.backgammonmastermind.development` | Backgammon Mastermind | `6780139011` | Dev-client internal builds only |
| `preview` | `com.backgammonmastermind.preview` | BackgammonMastermind (d8480c) | **`6781121420`** | **QA / TestFlight** (`pnpm build:preview:ios`) |
| `production` | `com.backgammonmastermind` | *(not created yet)* | — | App Store release (future) |

Preview IPAs must go to **`6781121420`**. Sending them to the development app (`6780139011`) fails with error **90055** (*bundle identifier cannot be changed*).

`eas.json` submit profiles pin `ascAppId` for preview; production omits it until a production ASC record exists.

`eas submit` reads bundle ID from **local** env by default (`.env` → `development`). Always pass preview env when submitting preview builds:

```sh
EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --id <preview-build-id>
```

`eas.json` submit profiles set `bundleIdentifier` per profile so EAS targets the correct App Store Connect app.

`eas.json` wires `metadataPath` for `preview` and `production` submit profiles.

**Screenshots** are not in `store.config.json` yet — upload via App Store Connect or add when EAS Metadata supports your screenshot set. Remotion exports in `docs/remotion/after/` can be used as a starting point.

## Apple team

EAS builds use team **Zachary Ebenfeld (Individual)** — `75M38Z9JBF` (set in `eas.json`).

## Checklist before first TestFlight

- [x] Replace `apple.review.phone` in `store.config.json`
- [ ] iOS preview build finished on EAS
- [ ] `eas submit --platform ios --profile preview --latest`
- [ ] `pnpm metadata:push` (after binary is processed)
- [ ] Add screenshots in App Store Connect
- [ ] Add yourself as internal TestFlight tester
