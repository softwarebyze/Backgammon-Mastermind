# Release gates

What ships when lives in [GitHub Issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) and [Milestones](https://github.com/softwarebyze/Backgammon-Mastermind/milestones) — not here. Current release scope and progress: [#159](https://github.com/softwarebyze/Backgammon-Mastermind/issues/159) and the [v1.1.0 milestone](https://github.com/softwarebyze/Backgammon-Mastermind/milestone/1).

## Automated bar

CI is the enforcer — lint, type-check, Jest, knip, Expo Doctor, Android Maestro. Do not re-check those by hand.

## Human gates

Required before promoting to TestFlight or production:

- **Device smoke** on a release build (iPhone; iPad too if UI was touched): vs Computer + 2-player, Resume, Learn to Play.
- **Marketing version bump**: `package.json` `"version"` + `store.config.json` `apple.version` + matching git tag (`v1.0.1`). EAS remote build numbers (`CFBundleVersion` / `versionCode`) stay managed by EAS — do not bump them by hand. How-to: [releases.md](./releases.md).
- **Owner sign-off** before any production promotion.

Google Play parity stays on [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160) and its separate [milestone](https://github.com/softwarebyze/Backgammon-Mastermind/milestone/2). It is not a TestFlight gate.

## PR discipline

- One concern per PR; split past ~400 lines.
- Verification in the PR body (commands + artifacts). How-to: [releases.md](./releases.md).

## Related

- [releases.md](./releases.md) — TestFlight / store / GitHub how-to
- [production-checklist.md](./production-checklist.md) — first App Store / Play submission
- [store-screenshots.md](./store-screenshots.md) — Fastlane ASC / Play screenshots
- [eas-metadata.md](./eas-metadata.md) — listing copy
- [ios-testing-and-store.md](./ios-testing-and-store.md) — which ASC app gets which binary
