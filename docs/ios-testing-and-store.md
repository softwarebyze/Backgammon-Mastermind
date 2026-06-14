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

```sh
# After first binary is in App Store Connect:
pnpm metadata:pull    # optional — import existing ASC listing
pnpm metadata:push    # push store.config.json to App Store Connect
```

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
