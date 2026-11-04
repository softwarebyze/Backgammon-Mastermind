# iOS testing & App Store submit

## Contact email

Store listings, privacy policy, and in-app Support use **zackebenfeld@gmail.com** (personal account).

Before any metadata push, confirm `store.config.json` → `apple.review.phone` is correct (currently **+1 954 593 1670**).

**App Store listing sync (EAS Metadata):** see **[eas-metadata.md](./eas-metadata.md)** — edit `store.config.json`, then `pnpm metadata:push` / `pnpm metadata:push:production`.

## iOS testing paths

| Path | Best for | Command |
| ---- | -------- | ------- |
| **Dev client** (recommended) | Daily testing on your iPhone with OTA JS updates | `pnpm build:development:ios` |
| **TestFlight** | Beta testers, pre-release QA | `pnpm build:preview:ios` then `EXPO_PUBLIC_APP_ENV=preview pnpm submit:preview:ios` |
| **Simulator** | CI / quick UI checks | `eas build --profile simulator --platform ios` |
| **TestFlight from a PR (no EAS build)** | Trying a PR on your iPhone without spending EAS builds | Add the `testflight` label to the PR |

### TestFlight from a PR, without an EAS build

The **TestFlight (PR, no EAS build)** workflow builds the Preview app on a GitHub-hosted Mac and uploads it to the [Preview app's TestFlight](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios). It signs with the App Store certificate and profiles EAS already stores (`scripts/ios-signing-from-eas.mjs`) and uploads with the App Store Connect key stored in EAS (`scripts/asc-api-key-from-eas.mjs`). Both are read through the Expo API with the `EXPO_TOKEN` secret, so no EAS build minutes are used.

1. Add the `testflight` label to the PR. Each push while the label is on uploads a new build; remove the label to stop.
2. The workflow comments on the PR with the build number, for example `1.1.0 (23.512.1)`. The number sits between EAS's whole build numbers, so later EAS builds still upload.
3. When Apple finishes processing, the build appears in the TestFlight app on your iPhone (install TestFlight and accept the Preview app's internal tester invite once).

This build turns off over-the-air updates, so it always runs the PR's own code.

**Android:** every PR's Android test run also publishes `pr-<number>-preview.apk` on the `pr-test-builds` release and comments the link on the PR. Open it on the phone to install; it sits next to the Play Store app.

### Dev client (your iPhone)

1. Register device (once): `eas device:create` or [Expo Devices](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/devices)
2. Build: `pnpm build:development:ios` (or GitHub Actions → **EAS QA Build** with iOS enabled)
3. Install the IPA from the EAS build page (open link in Safari on the device)
4. Start Metro: `pnpm start` — app loads JS from your machine or EAS Update on PRs

### TestFlight

1. Build preview IPA: `pnpm build:preview:ios`
2. Submit: `EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --latest` (or `pnpm submit:preview:ios`)
3. After Apple processes the build, enable TestFlight testers in App Store Connect ([Preview app](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios))

## Submit the right build to the right ASC app

Three separate App Store Connect records — do not mix them up.

| EAS env | Bundle ID | ASC name | Apple ID (`ascAppId`) | Role |
|---------|-----------|----------|----------------------|------|
| `development` | `com.backgammonmastermind.development` | Backgammon Mastermind Dev | `6780139011` | Dev-client internal builds only |
| `preview` | `com.backgammonmastermind.preview` | Backgammon Mastermind Preview | **`6781121420`** | **QA / TestFlight** |
| `production` | `com.backgammonmastermind` | Backgammon Mastermind | **`6792138473`** | App Store release |

Preview IPAs must go to **`6781121420`**. Sending them to the development app (`6780139011`) fails with error **90055** (*bundle identifier cannot be changed*).

`eas.json` submit profiles pin `ascAppId` + `bundleIdentifier` for both `preview` and `production`. `eas submit` still reads local `.env` by default — always pass the matching `EXPO_PUBLIC_APP_ENV` when submitting.

```sh
EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --id <preview-build-id>
EXPO_PUBLIC_APP_ENV=production eas submit --platform ios --profile production --latest
```

**Screenshots:** Fastlane — [store-screenshots.md](./store-screenshots.md). Not in `store.config.json`.

## Apple team

EAS builds use team **Zachary Ebenfeld (Individual)** — `75M38Z9JBF` (set in `eas.json`).
