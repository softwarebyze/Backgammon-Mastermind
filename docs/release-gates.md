# Release gates

Process for shipping without regressions. **Do not** mirror live store status here — that lives in [GitHub Issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) and [Milestones](https://github.com/softwarebyze/Backgammon-Mastermind/milestones).

Two tracks. **Track A first** (stores). **Track B** only after A is done, or explicitly parallelized **without** touching gameplay.

| Track | Milestone | Meta issue |
|-------|-----------|------------|
| **A — Store parity** | [Store parity — Play + version sync](https://github.com/softwarebyze/Backgammon-Mastermind/milestone/2) | [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160) Play upload |
| **B — Correctness** | [v1.1.0 — Correctness & resilience](https://github.com/softwarebyze/Backgammon-Mastermind/milestone/1) | [#159](https://github.com/softwarebyze/Backgammon-Mastermind/issues/159) |

---

## Track A — stores first

Metadata, screenshots, version sync, and store submit only. **No game rules, Learn, or Expo SDK changes.**

1. Play Console app + content rating. Fastlane screenshot upload needs GH secret `GOOGLE_SERVICE_ACCOUNT_BASE64`; EAS Android submit needs EAS secret `GOOGLE_SERVICE_ACCOUNT` (separate). Secret inventory lives on [#160](https://github.com/softwarebyze/Backgammon-Mastermind/issues/160) — do not duplicate it here.
2. Stage Android phone screenshots from existing marketing captures → Actions **Upload Store Screenshots** (android)
3. Actions **EAS Production Build and Submit (Android)** — only when Play Console is ready; do not start this from a docs-only PR
4. Keep `package.json` `"version"` and `store.config.json` `apple.version` matching the live App Store marketing version

Confirm live ASC versions with `pnpm asc:status` (read-only; needs Expo / ASC key). Listing copy still ships via [`store.config.json` + `metadata:push*`](./eas-metadata.md), not ad-hoc ASC scripts.

---

## Track B — v1.1.0 correctness

Strict order (do not skip ahead):

1. [#155](https://github.com/softwarebyze/Backgammon-Mastermind/issues/155) Dice max-usage + higher-die — **tests first**, then engine
2. [#156](https://github.com/softwarebyze/Backgammon-Mastermind/issues/156) Saved-game validate/recover — **tests first**
3. [#158](https://github.com/softwarebyze/Backgammon-Mastermind/issues/158) pnpm 10 overrides/patches reliability
4. [#153](https://github.com/softwarebyze/Backgammon-Mastermind/pull/153) Startup/perf — rebase on `main` after 155/156, review, merge only if CI green
5. [#157](https://github.com/softwarebyze/Backgammon-Mastermind/issues/157) Expo SDK 57 — **last**; highest blast radius

Never merge Expo 57 in the same PR as rules/engine changes.

---

## Hard gates

Required before promoting **1.1.0** (TestFlight or production). Track A still needs `pnpm check-all` on every PR; the rest of this list is the 1.1.0 promotion bar.

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
