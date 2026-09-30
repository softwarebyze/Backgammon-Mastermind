# AGENTS.md

## Definition of done (always)

Every user-visible change ships with all three, or it is not done:

1. **Unit / regression tests** for the logic you touched. If the change is a
   bug fix, the test must fail without the fix.
2. **A Maestro flow covering the feature**, when the change is reachable in the
   app UI. Add or extend `.maestro/app/*.yaml`. Web-only UI still needs a
   Maestro flow if the same screen is reachable on iOS/Android.
3. **Evidence on the PR** — screenshot for visual changes, a screen recording
   when a gesture/animation/flow is involved. Attach to the PR; see below.

`pnpm check-all` (lint + type-check + translations + jest + knip) must pass
before you open or update the PR. Prefer it over running the individual steps.

## PR evidence (always)

When the user asks for a fix/feature and you open or update a PR, **finish the chat reply** with this block (fill real numbers/links):

```text
Updated PR #<n>, preview <preview-url>.
PR includes screenshots and recordings showing the fix/feature.
```

When you mention a PR mid-reply (not only in that closer), include the preview URL next to it when one exists — e.g. [PR #129](…) · [preview](…). Not required on every casual mention; do it when the user asked about that work or when the preview is useful.
In the **PR body**, document each change with evidence — not a wall of text:

- `Fixed <thing>` + screenshot (or image link)
- `Fixed <thing>` + screen recording / video link
- Same pattern for features: `Added <thing>` + media

### How evidence actually renders

The Android Maestro run records with `adb screenrecord`, builds an HTML
player/gallery, and uploads the `maestro-visual-report` artifact. Screenshots
use the `maestro-screenshots` branch; recordings use per-run, per-attempt release
assets. The sticky PR comment links both. A release download URL is not a
guarantee of inline GitHub playback. GitHub also supports attaching videos
directly in PR comments; do not claim a single host is the only supported one.

For app changes, let CI publish the evidence. Check that the recording link
actually opens, and use the HTML bundle below to watch it locally.

To review a run's bundle locally (screenshots + recording + HTML):

```
pnpm e2e:report              # latest e2e-android.yml run for this branch
pnpm e2e:report <run-id>     # a specific run
```

For manual Argent/simulator/web captures, attach them to the PR. Do **not** add
new files under `docs/pr-evidence/` — that directory is large and tracked in
history, so it only grows the repo. The existing files stay; new evidence goes
on the PR.

Tracked as [#128](https://github.com/softwarebyze/Backgammon-Mastermind/issues/128).

## Cursor Cloud specific instructions

### Store listing updates

Prefer **`store.config.json` + `pnpm metadata:push` / `pnpm metadata:push:production`** (or Actions → **EAS Metadata Push**) over one-off App Store Connect API scripts. How-to: [docs/eas-metadata.md](./docs/eas-metadata.md). Screenshots: Fastlane — [docs/store-screenshots.md](./docs/store-screenshots.md) (`pnpm screenshots:upload:ios`). Price and privacy nutrition labels are ASC UI-only for now.

### Overview

Backgammon Mastermind is a single-package React Native / Expo app (no backend, no database). All game logic is client-side TypeScript.

### Running the app

- **Web (primary for Cloud Agents):** `pnpm web` — starts Expo web on port 8081.
- **Native (requires simulator/emulator):** `pnpm ios` / `pnpm android` — not available in Cloud Agent VMs.

### Lint / Type-check / Test

Standard commands from `package.json`:

```
pnpm lint          # ESLint (src, app.config.ts, env.ts, .maestro)
pnpm type-check    # tsc --noemit
pnpm test          # Jest unit tests
pnpm knip          # unused exports (also CI)
pnpm notices       # regenerate THIRD_PARTY_NOTICES.md (a test fails if stale)
pnpm check-all     # lint + type-check + lint:translations + test + knip
```

Scripts under `scripts/*.ts` are build/CI tooling, not app code. They run via
`tsx`, except the install hook, which uses Node 22+ type stripping so production
installs do not require devDependencies. These scripts are covered by
`tsconfig.scripts.json`, which `check-all` type-checks. Keep app-code tsconfigs
out of them and vice versa.

### Third-party licensing

`THIRD_PARTY_NOTICES.md` is **generated** — never edit it by hand. It uses the pinned
`@callstack/licenses` API from react-native-legal to scan direct and transitive
production packages and extract license text, including MIT. Scan warnings fail
generation. The scanner selects one license file per package; additional notices,
its missing-license list, and optional/native dependencies need review before
distribution. Generation alone is not a complete license audit. The local
`file:` expo-bgsage module is handled by the project-specific MPL/source notice.
The generator also writes `assets/licenses/third_party_notices.json`, which
`expo-asset` embeds explicitly in native builds. Run
`pnpm notices` after adding/removing a dependency, changing the bgsage pin, or
updating the bundled fonts. `src/lib/third-party-notices.test.ts` fails if the
committed file drifts, so CI enforces it.

The bgsage pin lives in `expo-bgsage/upstream.json` and is the single source of
truth: `fetch-bgsage-engine.sh` checks it out, the notices generator prints it,
and the tests assert `src/lib/app-links.ts` agrees. Do not add a second copy.

Inter is bundled and is **OFL-1.1**, not MIT; its license ships in
`assets/licenses/` and is bundled into the app. Keep it there.

`public/bgsage/bgsage.{js,wasm,data}` are committed prebuilt binaries and are
**not reproducible from the vendored source**: the WASM shim is not vendored and
emcc is not a build dependency. They are guarded by SHA-256 pins in
`src/lib/bgsage-artifacts.test.ts`, not regenerated by any build. Replacing them
is a manual artifact swap plus a deliberate pin bump — do not assume a local
rebuild exists.

### Environment setup notes

- `.env` is required — copy from `.env.example` (only sets `EXPO_PUBLIC_APP_ENV=development`).
- pnpm 10 may warn about ignored build scripts (`@parcel/watcher`, `esbuild`, `sharp`, `unrs-resolver`). These do **not** block lint, type-check, test, or web bundling — the pure-JS fallbacks work fine.
- No Docker, no external services, no API keys needed for local development.

### Pre-commit hooks (Husky)

The repo uses Husky with:

- `pre-commit`: runs `pnpm type-check` and `pnpm lint-staged`
- `commit-msg`: runs commitlint (conventional commits required)
- Branch protection: direct commits to `main`/`master` are blocked unless `SKIP_BRANCH_PROTECTION` is set.

Cloud Agents work on feature branches, so branch protection does not apply. Set `SKIP_BRANCH_PROTECTION=1` if needed.
