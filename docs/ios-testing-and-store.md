# iOS testing & App Store submit

## Contact email

Store listings, privacy policy, and in-app Support use **zackebenfeld@gmail.com** (personal account).

Before any metadata push, confirm ``store.config.js` + `store/locales/` → `apple.review.phone` is correct (currently **+1 954 593 1670**).

**App Store listing sync (EAS Metadata):** see **[eas-metadata.md](./eas-metadata.md)** — edit ``store.config.js` + `store/locales/`, then `pnpm metadata:push` / `pnpm metadata:push:production`.

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
2. Submit: `EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --latest` (or `pnpm submit:preview:ios`)
3. After Apple processes the build, enable TestFlight testers in App Store Connect ([TF app](https://appstoreconnect.apple.com/apps/6781121420/testflight/ios))

## Submit the right build to the right ASC app

Three separate App Store Connect records — do not mix them up.

| EAS env | Bundle ID | ASC name | Apple ID (`ascAppId`) | Role |
|---------|-----------|----------|----------------------|------|
| `development` | `com.backgammonmastermind.development` | Backgammon Mastermind Dev | `6780139011` | Dev-client internal builds only |
| `preview` | `com.backgammonmastermind.preview` | Backgammon Mastermind TF | **`6781121420`** | **QA / TestFlight** |
| `production` | `com.backgammonmastermind` | Backgammon Mastermind | **`6792138473`** | App Store release |

Preview IPAs must go to **`6781121420`**. Sending them to the development app (`6780139011`) fails with error **90055** (*bundle identifier cannot be changed*).

`eas.json` submit profiles pin `ascAppId` + `bundleIdentifier` for both `preview` and `production`. `eas submit` still reads local `.env` by default — always pass the matching `EXPO_PUBLIC_APP_ENV` when submitting.

```sh
EXPO_PUBLIC_APP_ENV=preview eas submit --platform ios --profile preview --id <preview-build-id>
EXPO_PUBLIC_APP_ENV=production eas submit --platform ios --profile production --latest
```

**Screenshots:** Fastlane — [store-screenshots.md](./store-screenshots.md). Not in ``store.config.js` + `store/locales/`.

## Apple team

EAS builds use team **Zachary Ebenfeld (Individual)** — `75M38Z9JBF` (set in `eas.json`).
