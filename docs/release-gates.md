# Release gates

Process for shipping without regressions. **Do not** mirror live store status here — that lives in [GitHub Issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) and [Milestones](https://github.com/softwarebyze/Backgammon-Mastermind/milestones).

The current release scope and progress live in [#159](https://github.com/softwarebyze/Backgammon-Mastermind/issues/159) and the [v1.1.0 milestone](https://github.com/softwarebyze/Backgammon-Mastermind/milestone/1). Treat those as the sprint plan; this document defines the promotion gates.

## v1.1.0 — correctness and resilience

The dice legality, saved-game recovery, pnpm overrides, startup, and Expo SDK 57 implementation work has landed. SDK QA closure remains tracked on [#157](https://github.com/softwarebyze/Backgammon-Mastermind/issues/157). Do not restart that historical implementation sequence.

Complete the scoped gameplay fixes and their regression flows, Confirm move and Tutor integration, reduced motion, and native evidence. Choose the Tutor design before promoting its draft prototype to production. Analytics and other optional work should not delay mandatory correctness and accessibility gates.

The path is: validated PRs → integrated main QA → synchronized marketing version bump → native build → TestFlight → owner sign-off before production promotion.

Google Play parity stays on [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160) and its separate [milestone](https://github.com/softwarebyze/Backgammon-Mastermind/milestone/2). It is not a v1.1.0 TestFlight gate. Confirm current store state before closing that tracker.

---

## Hard gates

Required before promoting **1.1.0** (TestFlight or production). Every PR needs `pnpm check-all`; the rest of this list is the 1.1.0 promotion bar.

| Gate | How |
|------|-----|
| **check-all** | `pnpm check-all` green from a **clean** `pnpm install` (lint, tsc, translations, Jest, knip) |
| **Expo Doctor** | Green, or each failure documented. CI: [expo-doctor.yml](../.github/workflows/expo-doctor.yml). Known SDK 56 exception: Hermes V1 memory advisory in [expo-doctor.sh](../.github/scripts/expo-doctor.sh) |
| **Maestro** | Android smoke [`.maestro/app/backgammon-smoke.yaml`](../.maestro/app/backgammon-smoke.yaml) with screenshot artifact (CI on `src/**` / `.maestro/**` + `main`) |
| **Dice matrix** | Jest rule matrix for [#155](https://github.com/softwarebyze/Backgammon-Mastermind/issues/155) (max dice usage, higher-die, bar, bear-off, doubles, both colors, compound paths) |
| **Save recovery** | [#156](https://github.com/softwarebyze/Backgammon-Mastermind/issues/156) tests: invalid shape, interrupted write, quarantine, resume without crashing home |
| **Device smoke** | iPhone release-build smoke; **iPad** too if UI was touched. vs Computer + 2-player, Resume, Learn to Play |

`main` stays releasable. A red gate blocks promotion, not drive-by commits on an unrelated track.

---

## One concern per PR

- One concern: dice legality **or** save recovery **or** SDK **or** store metadata — not a bundle.
- If a PR grows past ~400 lines, split.
- Tests required: Jest for logic; Maestro for flows; screenshots for visual ([#128](https://github.com/softwarebyze/Backgammon-Mastermind/issues/128)).
- Verification in the PR body (commands + artifacts). How-to: [releases.md](./releases.md).

---

## Product scope that stays put

| Keep | Do not pull into A or B |
|------|-------------------------|
| **Learn to Play stays** in the app. Do not merge remove-Learn work. | Full i18n ([#140](https://github.com/softwarebyze/Backgammon-Mastermind/issues/140)) |
| **Game history / saved boards** is **post-v1** ([#97](https://github.com/softwarebyze/Backgammon-Mastermind/issues/97), [#73](https://github.com/softwarebyze/Backgammon-Mastermind/issues/73)) | Themes, share-a-game, native-sim template chores |

---

## Version numbers vs EAS build numbers

Update **both** of these together when the **marketing** version changes:

| File | Field |
|------|--------|
| `package.json` | `"version"` |
| `store.config.json` | `apple.version` |

**EAS remote build numbers stay separate.** `eas.json` uses `cli.appVersionSource: "remote"` and `autoIncrement: true`. iOS `CFBundleVersion` / Android `versionCode` are incremented by EAS; do not invent a local bump to “catch up” to ASC build 6/7. Confirm native builds on [expo.dev](https://expo.dev/accounts/zackebenfeld/projects/backgammon-mastermind/builds).

Git tags (`v1.0.1`) should match `package.json` when cutting a GitHub Release. How-to: [releases.md](./releases.md).

---

## Related

- [releases.md](./releases.md) — TestFlight / store / GitHub how-to
- [production-checklist.md](./production-checklist.md) — first App Store / Play submission
- [store-screenshots.md](./store-screenshots.md) — Fastlane ASC / Play screenshots
- [eas-metadata.md](./eas-metadata.md) — listing copy
- [ios-testing-and-store.md](./ios-testing-and-store.md) — which ASC app gets which binary
