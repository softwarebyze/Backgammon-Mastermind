# Obytes Template Playbook

Generic lessons from bootstrapping real apps on [Obytes React Native Template](https://starter.obytes.com). Use this when starting **any** Obytes-based project—not just Backgammon Mastermind.

**Philosophy:** Obytes is battle-tested. Prefer **upstreaming** fixes to a personal template fork over one-off hacks in each app. Only change template defaults when you understand *why* the default exists.

---

## 1. First-hour checklist (every new app)

### EAS / Expo project identity

After `eas init --id <your-project-id>`:


| File            | What to change                                 | Upstream?                                    |
| --------------- | ---------------------------------------------- | -------------------------------------------- |
| `app.config.ts` | `EXPO_ACCOUNT_OWNER`, `EAS_PROJECT_ID`, `slug` | **App-specific** (never commit template IDs) |
| `env.ts`        | `NAME`, bundle IDs, **lowercase** schemes per environment | **App-specific** — but see [URL scheme casing](#url-scheme-casing-template-bug--breaks-eas-update) |
| `package.json`  | `name`, `repository.url`                       | **App-specific**                             |
| `README.md`     | Clone URL, app name                            | **App-specific**                             |


**Common mistake:** Running `eas init` locally but leaving template `owner: 'obytes'` and template `projectId` in `app.config.ts`. Builds and `eas project:info` will fail with "Entity not authorized".

### Environment files


| Action                                     | Upstream?                                   |
| ------------------------------------------ | ------------------------------------------- |
| Add `.env` to `.gitignore`                 | **Yes — template should not commit `.env`** |
| Add `.env.example` with documented keys    | **Yes**                                     |
| `git rm --cached .env` if it was committed | Per-app cleanup                             |


### GitHub Actions secrets (required for CI)

Stock Obytes workflows expect **two repository secrets**. Without them, EAS builds/previews and Maestro Cloud E2E will fail or be skipped.


| Secret                  | Used by                                                                       | Get the value                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`            | `preview.yml`, `eas-build-qa.yml`, `eas-build-prod.yml`, EAS composite action | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) — create a token for the Expo account that owns your EAS project |
| `MAESTRO_CLOUD_API_KEY` | `e2e-android-maestro.yml`, `e2e-android-eas-build.yml`                        | [Maestro Cloud → CI integration → GitHub Actions](https://cloud.mobile.dev/ci-integration/github-actions#add-your-api-key-secret)           |


**How to add them in GitHub**

1. Open your repo on GitHub (e.g. `https://github.com/<org>/<repo>`)
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret by exact name (case-sensitive):
  - Name: `EXPO_TOKEN` → paste your Expo access token → **Add secret**
  - Name: `MAESTRO_CLOUD_API_KEY` → paste your Maestro Cloud API key → **Add secret**

Direct link pattern: `https://github.com/<org>/<repo>/settings/secrets/actions`

**What works without secrets**


| Workflow                                               | Needs secret?           |
| ------------------------------------------------------ | ----------------------- |
| Lint, type-check, Jest, expo-doctor                    | No                      |
| PR preview QR (`preview.yml`)                          | `EXPO_TOKEN`            |
| EAS QA / production builds                             | `EXPO_TOKEN`            |
| Maestro Cloud E2E (label `android-test-maestro-cloud`) | `MAESTRO_CLOUD_API_KEY` |


Add this checklist to every new fork’s README or `.env.example` comment block so CI setup is not forgotten after local dev works.

### Monorepo / Replit migration

If migrating from Replit or another monorepo:

- Remove `catalog:`, `workspace:`*, and `pnpm-workspace.yaml` references before flattening to a single app
- Pin `react` / `react-dom` to the Expo SDK version (SDK 54 → `19.1.0`)
- Use `node-linker=hoisted` in `.npmrc` for Expo + pnpm
- Archive old code under `replit/` (or delete) rather than leaving dual roots

### Local `.pnpm-store/` in the project root (not a template bug)

**Not caused by** stock Obytes (`.npmrc` has no `store-dir`) or Replit migration (`replit/.npmrc` is the same).

pnpm normally caches packages in a **global** store (`~/Library/pnpm/store` on macOS). A **project-local** `.pnpm-store/` (~ hundreds of MB) appears when `pnpm install` runs somewhere that **cannot write the global store**—most often **Cursor/agent sandboxes**, some CI runners, or a mis-set `PNPM_HOME` / `store-dir`.


| Symptom                                                         | Fix                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Huge `.pnpm-store/` folder in repo root                         | `rm -rf .pnpm-store` — safe if `node_modules` already exists          |
| IDE opens random hashed files under `.pnpm-store/v11/files/...` | Close tab; exclude folder (below)                                     |
| Comes back after agent runs `pnpm install`                      | Expected in sandbox; delete again or run install in a normal terminal |


**Worth upstreaming to a personal Obytes fork anyway** (defensive, zero downside):


| Change                                                                        | Why                                 |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| `.gitignore`: `.pnpm-store/`                                                  | Never commit accidental local cache |
| `.vscode/settings.json`: `files.exclude` + `search.exclude` for `.pnpm-store` | Hide if an agent recreates it       |


Do **not** add `store-dir=.pnpm-store` to `.npmrc`—that would *force* the bad layout for everyone.

---

## 2. Dependencies & expo-doctor

### Always use `pnpm expo install` for Expo packages

Never `pnpm add expo-haptics@latest` manually. Wrong major versions slip in easily (e.g. `expo-haptics@55` vs SDK 54's `~15.0.8`).

```bash
pnpm expo install expo-haptics expo-updates
pnpm doctor   # or rely on CI expo-doctor workflow
```

### TypeScript + React 19

Obytes ships `@types/react@~19.1.17`. On some machines, `tsc` fails with "View cannot be used as JSX component" until types align with React 19.1.0.

**Options (pick one, document in fork):**


| Approach                                     | Tradeoff                                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Pin `@types/react@19.1.0`                    | Passes `tsc`; expo-doctor may warn                                   |
| Pin `@types/react@~19.1.10`                  | Satisfies doctor; verify `pnpm type-check`                           |
| Narrow `tsconfig.json` `include` to `src/`** | Stops type-checking `node_modules` sources; **recommended upstream** |


```json
"include": [
  "src/**/*.ts",
  "src/**/*.tsx",
  "app.config.ts",
  "env.ts",
  ".expo/types/**/*.ts",
  "expo-env.d.ts"
]
```

Add explicit `"skipLibCheck": true` in `compilerOptions` if not inherited.

---

## 3. CI/CD gaps in stock Obytes template

### What the template includes today


| Workflow             | Trigger                   | Notes                 |
| -------------------- | ------------------------- | --------------------- |
| `lint-ts.yml`        | PR + push to main         | ESLint                |
| `type-check.yml`     | PR + push to main         | `tsc`                 |
| `test.yml`           | PR + push to main         | Jest                  |
| `expo-doctor.yml`    | PR + push to main         | Dependency validation |
| `eas-build-qa.yml`   | Release published, manual | **Not on PR**         |
| `eas-build-prod.yml` | Manual only               | Production builds     |


### What the template does **not** include (add in fork)

#### PR preview QR (EAS Update)

Stock template has **no** `.github/workflows/preview.yml`. For a QR comment on every PR:

1. Install `expo-updates`
2. Configure `app.config.ts`:

```ts
runtimeVersion: { policy: 'appVersion' },
updates: {
  url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  fallbackToCacheTimeout: 0,
},
```

1. Add `expo-updates` plugin and `eas.json` update channels
2. Add workflow (see `.github/workflows/preview.yml` in this repo)
3. Add `EXPO_TOKEN` to GitHub Actions secrets — see [GitHub Actions secrets](#github-actions-secrets-required-for-ci)

**Important:** EAS Update QR loads JS into an **existing development build**. Reviewers need a dev client installed once (`pnpm build:development:android`). The QR does not replace a full native preview APK.

For installable APK per PR, add a separate `eas build --profile preview` job (slower, costs EAS build minutes).

#### `staging` vs `preview` env mismatch (template bug)

Stock `eas-build-qa.yml` and `eas-build` composite action use `APP_ENV: staging`, but Obytes v9 `env.ts` / `eas.json` / package scripts use `**preview`**, not `staging`. QA release builds will fail on `pnpm prebuild:staging`.

**Fix for fork:** Rename all `staging` → `preview` in:

- `.github/workflows/eas-build-qa.yml`
- `.github/actions/eas-build/action.yml`

#### URL scheme casing (template bug — breaks EAS Update)

**Priority upstream fix.** Stock Obytes `env.ts` ships PascalCase schemes that **pass local dev** but **fail EAS Update publish** once you add PR preview CI:

```ts
// Stock template (invalid for EAS Update manifest)
const SCHEMES = {
  development: 'obytesApp',        // uppercase "A" fails validation
  preview: 'obytesApp.preview',
  production: 'obytesApp',
} as const;
```

Expo's update manifest requires `scheme` to match `^[a-z][a-z0-9+.-]*$` (all lowercase). The bundle exports successfully; the failure happens at **Publishing…** after upload:

![EAS Update fails at publish with Manifest Validation Error on scheme](./assets/eas-update-scheme-validation-error.png)

Typical CI output:

```
✖ Failed to publish updates
Manifest Validation Error:
scheme:'scheme' must match pattern "^[a-z][a-z0-9+.-]*$"
scheme:must be array
scheme:must match exactly one schema in oneOf
This is likely a problem with your app.json, or app.config.js
Error: Could not create a new EAS Update
```

This is easy to miss: `expo start`, native builds, and even `eas build` may work while **`eas update` / PR preview QR silently breaks** until you fix schemes.

**Fix for every fork (do before enabling `preview.yml`):**

```ts
// env.ts — display name can stay PascalCase; URL scheme cannot
const SCHEMES = {
  development: 'myapp.dev',
  preview: 'myapp.preview',
  production: 'myapp',
} as const;

// Catch mistakes at scaffold time, not in CI
EXPO_PUBLIC_SCHEME: z.string().regex(/^[a-z][a-z0-9+.-]*$/),
```

**Upstream PR for [obytes/react-native-template-obytes](https://github.com/obytes/react-native-template-obytes):**

1. Lowercase default `SCHEMES` (e.g. `obytesapp`, `obytesapp.preview`)
2. Add the zod regex on `EXPO_PUBLIC_SCHEME`
3. Comment in `env.ts` that `NAME` (display) and `SCHEME` (deep link) follow different rules
4. If adding stock `preview.yml`, document this in template README so first PR preview doesn't fail

After changing schemes, **rebuild the dev client** — native builds embed the scheme at compile time.

#### `uniwind-types.d.ts` + PR lint CI mismatch (template bug)

**Confirmed in stock Obytes v9** — not just this repo.

| What | Stock template |
| ---- | -------------- |
| `uniwind-types.d.ts` | **Committed** with header *"generated by uniwind… should not be edited manually"* |
| ESLint rule | `ts/consistent-type-definitions: type` (interfaces fail) |
| PR lint workflow | `reviewdog` runs `eslint . --ext .js,.jsx,.ts,.tsx` (entire repo root) |
| Local `pnpm lint` (many forks) | Often scoped to `src/` only → **CI finds issues local lint misses** |

Upstream v9 currently generates `export type UniwindConfig` (passes). Older uniwind output used `export interface` → reviewdog reports *Use a type instead of an interface* on a file you're not supposed to touch.

**Fix for fork (recommended):**

1. **`.gitignore`**: add `uniwind-types.d.ts` (same pattern as `expo-env.d.ts`)
2. **Commit `uniwind-env.d.ts`** with `/// <reference types="uniwind/types" />` + static `UniwindConfig` — CI needs this for `className` on RN components (replacing broken `nativewind-env.d.ts`)
3. **`git rm --cached uniwind-types.d.ts`** — optional locally; generator may recreate gitignored copy
3. **`eslint.config.mjs` ignores**: `uniwind-types.d.ts`, `nativewind-env.d.ts`
4. **`.github/workflows/lint-ts.yml`**: align reviewdog with your lint script:

```yaml
eslint_flags: 'src app.config.ts env.ts .maestro --ext .js,.jsx,.ts,.tsx'
```

**Upstream PR for Obytes:** gitignore generated uniwind types + make `lint-ts.yml` use `pnpm run lint` (or same scoped paths) so PR CI matches local DX.

#### Maestro E2E (backgammon smoke)

Single flow: `.maestro/app/backgammon-smoke.yaml` (home → vs computer → assert board).

| Trigger | Label / command | Secret |
| ------- | ---------------- | ------ |
| Maestro Cloud (fast, recommended) | `android-test-maestro-cloud` on PR, or **Actions → E2E Tests Android (Maestro Cloud) → Run workflow** | `MAESTRO_CLOUD_API_KEY` |
| GitHub emulator (no cloud account) | `android-test-github` on PR, or manual dispatch | — |
| EAS-built APK | **Actions → E2E Tests EAS Build Android** + paste APK URL | — |

CI uses `APP_ENV=preview` → `com.backgammonmastermind.preview`. Local dev client:

```bash
pnpm install-maestro   # once
pnpm e2e-smoke         # or pnpm e2e-test (same flow)
```

`.maestro/config.yaml` lists only `app/backgammon-smoke.yaml` (demo auth/onboarding flows removed).

Bundle IDs — replace template `com.obytes.*` in:

- `package.json` → `e2e-test` / `e2e-smoke`
- `.github/workflows/e2e-android*.yml`

Also add `MAESTRO_CLOUD_API_KEY` to GitHub Actions secrets before enabling Maestro Cloud workflows — see [GitHub Actions secrets](#github-actions-secrets-required-for-ci).

---

## 4. Dev client vs Expo Go

Obytes includes `expo-dev-client` and native modules (MMKV, etc.). **Expo Go is not sufficient** for the full app.


| Goal             | Command                                     |
| ---------------- | ------------------------------------------- |
| Local Metro      | `pnpm start`                                |
| Native run       | `pnpm prebuild:development && pnpm android` |
| Cloud dev client | `pnpm build:development:android`            |
| PR JS preview    | EAS Update QR (needs dev client on device)  |
| Test APK         | `pnpm build:preview:android`                |


After changing `slug` or native config, rebuild the dev client.

### Dev client + PR preview workflow (recommended fork pattern)

This is the **standard Expo team workflow** — not something Obytes ships end-to-end, but it's the intended pairing once you add `expo-updates` + `preview.yml`. Official reference: [Development workflows → PR previews](https://docs.expo.dev/develop/development-builds/development-workflows/#pr-previews) and [EAS Update GitHub Action](https://docs.expo.dev/eas-update/github-actions/).

#### Two layers (don't conflate them)

| Layer | What it is | How often | CI workflow |
| ----- | ---------- | --------- | ----------- |
| **Dev client** | Native shell with `expo-dev-client` + `expo-updates` baked in | Reinstall when native deps/config change | `dev-client.yml` (path-filtered push to `main`) |
| **EAS Update** | JS/assets bundle for a branch/PR | Every PR push | `preview.yml` (`eas update --auto`) |

The PR QR code is an **EAS Update**, not a new APK. It deep-links into an **already installed** dev client (`qr-target: dev-build` in the GitHub Action). That's why reviewers see a QR but nothing happens without the dev client — expected, not broken.

#### Reviewer experience (what to automate + document)

On every PR, reviewers should see **two comments**:

1. **Expo bot** — QR for *this PR's* update (auto from `expo/expo-github-action/preview@v8`)
2. **Sticky setup guide** — "first time? install dev client here → then scan QR above" (second step in `preview.yml`)

First-time flow:

1. Install dev client from [EAS builds → development profile](https://expo.dev/projects/YOUR_PROJECT_ID/builds?profile=development) (Android: download APK; iOS: TestFlight/internal)
2. Open app once
3. Scan PR QR → loads PR branch JS

Returning reviewer: scan QR only.

#### Keep the dev client fresh (CI)

Stock Obytes only has **manual** `pnpm build:development:android`. Add **`.github/workflows/dev-client.yml`** to rebuild on native-affecting merges:

```yaml
on:
  push:
    branches: [main]
    paths:
      - package.json
      - pnpm-lock.yaml
      - app.config.ts
      - eas.json
      - env.ts
  workflow_dispatch:  # manual "refresh dev client" button
```

Uses the existing Obytes `eas-build` composite action with `APP_ENV: development`. Link the EAS builds page in README and the PR sticky comment — no need to paste APK URLs into docs (they rotate).

**When dev client rebuild is required:** SDK upgrade, new native module, `runtimeVersion` bump, scheme/bundle ID change, `app.config.ts` plugin changes.

**When it is NOT required:** React screens, game logic, translations, anything JS-only (EAS Update handles it).

#### Channel alignment

Add `"channel": "preview"` to the **`development`** build profile in `eas.json` so the dev client and PR updates share the same EAS Update channel:

```json
"development": {
  "developmentClient": true,
  "channel": "preview",
  ...
}
```

PR workflow uses `eas update --auto --environment preview`. Matching channel lets the Extensions tab list recent PR updates without scanning.

#### Fork checklist (upstream to personal Obytes template)

| Add to fork | Why |
| ----------- | --- |
| `preview.yml` with `qr-target: dev-build` | Correct QR type when `expo-dev-client` is installed |
| Sticky PR comment with dev client install link | Closes the "QR does nothing" confusion for new reviewers |
| `dev-client.yml` on path-filtered push | Dev client stays current without manual `eas build` |
| `development.channel: preview` in `eas.json` | Dev client ↔ PR updates share channel |
| README "Previewing PRs" blurb | Points to EAS builds + PR flow |
| Lowercase URL schemes in `env.ts` | Required for EAS Update publish — [see bug section](#url-scheme-casing-template-bug--breaks-eas-update) |

#### Fallback: preview APK (no dev client)

For PMs/designers who won't install a dev client, Obytes already supports **`pnpm build:preview:android`** (full APK, `preview` profile). Tradeoffs:

| Approach | Setup | PR feedback speed | Best for |
| -------- | ----- | ----------------- | -------- |
| Dev client + EAS Update | One-time install | ~2 min per PR push | Engineering, daily QA |
| Preview APK per PR | None | ~15–30 min + EAS minutes | Occasional stakeholders |

Some teams add a **label-gated** `eas build --profile preview` job (`preview-apk` label) — optional, costs build minutes.

#### What Obytes gives you vs what you add

| Stock Obytes | You add for full PR preview DX |
| ------------ | ------------------------------ |
| `expo-dev-client` dep | `expo-updates` + `app.config.ts` updates config |
| `eas build` scripts + composite action | `preview.yml` |
| Manual dev client build | `dev-client.yml` auto-rebuild |
| Nothing | PR sticky comment + README |
| PascalCase schemes (bug) | Lowercase schemes + zod validation |

---

## 5. Agent tooling (recommended fork additions)

Modern RN agent workflows benefit from three tool layers:

### Expo Skills (`npx skills add expo/skills -y`)

Official Expo agent skills (EAS, deployment, native UI, upgrades). Install per repo; commit `.agents/skills/`.

Add to `package.json`:

```json
"skills:update": "skills update"
```

**Upstream:** Document in template README as optional post-scaffold step.

### Argent (`npx @swmansion/argent init`)

Software Mansion MCP for iOS/Android simulators—tap, profile, debug. Adds `.cursor/mcp.json`, skills, rules.

**Upstream:** Optional post-scaffold; commit MCP config for team consistency.

### agent-device (Callstack)

CLI for accessibility-tree snapshots and interaction (`agent-device snapshot -i`, `press @e1`). Lighter than screenshots for agents.

Add scripts:

```json
"device:open": "agent-device --session android open <your.bundle.id> --platform android",
"device:snapshot": "agent-device --session android snapshot -i"
```

**Android accessibility:** Raw `View` layouts without labels produce empty agent snapshots. Add `accessibilityRole` / `accessibilityLabel` on interactive elements—helps agents *and* a11y.

Install globally or as devDependency; pin version in fork docs.

---

## 5b. ESLint formatting & IDE auto-fix (upstream recommended)

Obytes uses **ESLint Stylistic** as the formatter—not Prettier. Without explicit IDE setup, "Format Document" may invoke Prettier (double quotes) or the built-in TS formatter, causing **drift on committed files**. Opening archived folders (e.g. `replit/`) outside `tsconfig` `include` triggers **"Cannot use JSX unless the --jsx flag is provided"** in the IDE.

### Recommended fork changes


| Change                                                                                                  | Why                                                   |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `.vscode/settings.json`: ESLint as `defaultFormatter`, `formatOnSave`, `source.fixAll.eslint: "always"` | Auto-fix perfectionist/stylistic on save              |
| `.prettierignore` with `*`                                                                              | Block Prettier if the extension is installed globally |
| `eslint.rules.customizations`: include `perfectionist/*` as fixable                                     | Sort exports/imports fix on save without noise        |
| `tsconfig.json`: explicit `"jsx": "react-native"`, exclude `replit/` + `.agents/`                       | IDE TypeScript matches Expo                           |
| `replit/tsconfig.json` (if keeping archive)                                                             | JSX works when browsing old code                      |
| `eslint.config.mjs`: ignore `replit/`**, `.agents/**`                                                   | `pnpm lint` doesn't lint archived/generated trees     |
| `package.json`: `"lint": "eslint src app.config.ts env.ts"`, `"format": "pnpm lint:fix"`                | Lint scope = app code only                            |


### `.vscode/settings.json` essentials

```json
{
  "prettier.enable": false,
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "eslint.format.enable": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always",
    "source.organizeImports": "never"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "eslint.rules.customizations": [
    { "rule": "perfectionist/*", "severity": "off", "fixable": true }
  ]
}
```

Reload the window after changing settings. Run `**pnpm format**` before committing if you bulk-edited files outside the IDE.

---

## 6. Changes safe to keep app-specific (do not upstream)

- Game/product code under `src/features/`
- Branding (`assets/`, translations, `env.ts` name/IDs)
- Removing Obytes demo code (auth, feed, onboarding, `lib/api`) when building an offline/single-purpose app
- Custom Maestro flows for your product

---

## 7. Changes worth upstreaming to a personal Obytes fork


| Change                                                          | Why                                           |
| --------------------------------------------------------------- | --------------------------------------------- |
| **`env.ts`: lowercase `SCHEMES` + zod regex on scheme**         | **Stock template breaks EAS Update / PR QR** — see [URL scheme casing](#url-scheme-casing-template-bug--breaks-eas-update) |
| `dev-client.yml` + PR sticky comment + `development.channel`    | Always-fresh dev client + "first time?" reviewer UX — [Dev client workflow](#dev-client--pr-preview-workflow-recommended-fork-pattern) |
| `.env` gitignored + `.env.example`                              | Security baseline                             |
| `preview.yml` PR workflow                                       | Expected modern DX                            |
| README / playbook: `EXPO_TOKEN` + `MAESTRO_CLOUD_API_KEY` setup | CI fails silently without them                |
| `staging` → `preview` in EAS actions                            | Fixes broken QA builds                        |
| tsconfig `include` narrowed to `src/**`                         | Reliable `tsc` in CI                          |
| Placeholder `repository.url` → documented TODO                  | Avoids wrong clone instructions               |
| Maestro `APP_ID` from `env.ts` pattern                          | Document, not hardcode obytes                 |
| `skills:update` script + docs for Expo Skills                   | Agent-ready scaffold                          |
| Optional Argent / agent-device setup docs                       | Agent-ready scaffold                          |
| `expo-updates` pre-installed + configured                       | Enables PR previews out of box                |
| ESLint-as-formatter VS Code settings + `.prettierignore`        | No format drift; auto-fix on save             |
| `eslint` ignore `replit/**` + `.agents/**`                      | Lint scope = app only                         |
| Explicit `jsx` in tsconfig + archive exclude                    | Fixes IDE JSX errors                          |
| `pnpm format` script                                            | One command to apply all autofixes            |
| `.gitignore`: `.pnpm-store/` + VS Code exclude                  | Agent/sandbox installs; not in stock template |
| `.gitignore`: `uniwind-types.d.ts` + committed `uniwind-env.d.ts` | Generated types gitignored; CI needs `/// <reference types="uniwind/types" />` stub |
| `lint-ts.yml` reviewdog scope = `package.json` lint script      | Stock CI runs `eslint .`; scoped forks get false PR annotations |


---

## 8. Changes we deliberately did **not** make to core Obytes patterns


| Left alone                                      | Reason                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| Husky + commitlint + lint-staged                | Works; don't weaken without team agreement            |
| Feature folder structure (`src/features/`)      | Good separation                                       |
| MMKV, React Query, TanStack Form                | Template defaults                                     |
| Uniwind / Nativewind setup                      | Template styling system                               |
| Demo auth/feed screens (until product replaces) | Delete once product routes exist — don't leave dead code |
| `APIProvider` / React Query stack                 | Remove with feed/auth if app has no API                  |


---

## 9. Troubleshooting quick reference


| Symptom                                 | Likely cause                                             | Fix                                                                                                               |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `eas project:info` unauthorized         | Wrong `projectId` / owner in `app.config.ts`             | Match your EAS project                                                                                            |
| `catalog:` install error                | Monorepo leftover                                        | Pin versions in `package.json`                                                                                    |
| expo-doctor fails on expo-haptics major | Manual add used wrong version                            | `pnpm expo install expo-haptics`                                                                                  |
| PR has no QR comment                    | No `preview.yml` or missing `EXPO_TOKEN`                 | Add workflow + secret in Settings → Secrets → Actions                                                             |
| Maestro Cloud E2E fails auth            | Missing `MAESTRO_CLOUD_API_KEY`                          | Add secret from [Maestro CI docs](https://cloud.mobile.dev/ci-integration/github-actions#add-your-api-key-secret) |
| QR scans but app empty                  | No dev client on device                                  | Install development build from [EAS builds](https://expo.dev/projects/7ec6600a-8b02-4714-acc1-08385effa4c9/builds?profile=development) — see [dev client workflow](#dev-client--pr-preview-workflow-recommended-fork-pattern) |
| `eas.json is not valid: "update" is not allowed` | Invalid top-level `update` key in eas-cli 19+     | Remove `update` block; channels live on build profiles (`channel` in each profile)                                |
| EAS Update manifest: scheme must match `^[a-z]...` | **Stock Obytes `SCHEMES` use PascalCase** (`obytesApp`) | Lowercase schemes + zod regex in `env.ts`; rebuild dev client — [details & screenshot](#url-scheme-casing-template-bug--breaks-eas-update) |
| `pnpm prebuild:staging` fails           | Template staging/preview mismatch                        | Use `preview`                                                                                                     |
| Metro shows `exp+obytesapp://`          | Old dev client slug                                      | Rebuild dev client after slug change                                                                              |
| agent-device empty snapshot             | Missing a11y labels                                      | Add `accessibilityLabel` to buttons                                                                               |
| `tsc` fails in node_modules             | Broad `include` glob                                     | Narrow to `src/`**                                                                                                |
| Format changes committed files          | Prettier or wrong formatter                              | ESLint defaultFormatter + `.prettierignore`                                                                       |
| `Cannot use JSX unless --jsx flag`      | File outside tsconfig `include`                          | Exclude archive dirs; add explicit `"jsx": "react-native"`                                                        |
| `perfectionist/sort-exports` on save    | Not in ESLint fix-on-save                                | `source.fixAll.eslint: "always"` + perfectionist fixable                                                          |
| `.pnpm-store/` in project root          | Sandbox/agent `pnpm install` (global store not writable) | `rm -rf .pnpm-store`; gitignore + IDE exclude; not Obytes/Replit config                                           |
| reviewdog: `uniwind-types.d.ts` interface/type | **Template commits generated uniwind types** + CI runs `eslint .` | Gitignore generated file; commit `uniwind-env.d.ts` stub — [details](#uniwind-typesdts--pr-lint-ci-mismatch-template-bug) |
| `className` does not exist on `View` in CI tsc   | Removed `uniwind-types.d.ts` without committed `/// <reference types="uniwind/types" />` | Add `uniwind-env.d.ts` to repo + tsconfig `include` |


---

## 10. Backgammon Mastermind–specific notes

- Game engine: `src/lib/game/` (pure TS)
- UI + state: `src/features/game/`
- Replit source was migrated then **removed** — recover from git history if needed
- Obytes demo (auth, feed, API, onboarding) **removed** — offline game needs none of it
- EAS project: `@zackebenfeld/backgammon-mastermind`
- Bundle IDs: `com.backgammonmastermind.{development,preview,production}`

---

## 11. Maintenance commands

```bash
pnpm install
pnpm check-all          # lint + type-check + translations + test
pnpm doctor             # expo-doctor
pnpm skills:update      # refresh Expo agent skills
pnpm device:snapshot    # agent-device UI tree (Android dev build)
eas project:info        # verify EAS linkage
```

After dependency changes: commit `pnpm-lock.yaml`. CI uses `--frozen-lockfile`.