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
| `env.ts`        | `NAME`, bundle IDs, schemes per environment    | **App-specific**                             |
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

#### Maestro E2E app IDs

Template defaults use `com.obytes.`*. Replace with your `env.ts` bundle IDs in:

- `package.json` → `e2e-test` script
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
- Removing demo routes (feed, login, onboarding) when not needed
- Custom Maestro flows for your product
- `replit/` archive folder

---

## 7. Changes worth upstreaming to a personal Obytes fork


| Change                                                          | Why                                           |
| --------------------------------------------------------------- | --------------------------------------------- |
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


---

## 8. Changes we deliberately did **not** make to core Obytes patterns


| Left alone                                      | Reason                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| Husky + commitlint + lint-staged                | Works; don't weaken without team agreement            |
| Feature folder structure (`src/features/`)      | Good separation                                       |
| MMKV, React Query, TanStack Form                | Template defaults                                     |
| Uniwind / Nativewind setup                      | Template styling system                               |
| Demo auth/feed screens (until product replaces) | Removed only from routing, not deleted—easy reference |
| `APIProvider` wrapper                           | Harmless for offline games; remove when sure no API   |


---

## 9. Troubleshooting quick reference


| Symptom                                 | Likely cause                                             | Fix                                                                                                               |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `eas project:info` unauthorized         | Wrong `projectId` / owner in `app.config.ts`             | Match your EAS project                                                                                            |
| `catalog:` install error                | Monorepo leftover                                        | Pin versions in `package.json`                                                                                    |
| expo-doctor fails on expo-haptics major | Manual add used wrong version                            | `pnpm expo install expo-haptics`                                                                                  |
| PR has no QR comment                    | No `preview.yml` or missing `EXPO_TOKEN`                 | Add workflow + secret in Settings → Secrets → Actions                                                             |
| Maestro Cloud E2E fails auth            | Missing `MAESTRO_CLOUD_API_KEY`                          | Add secret from [Maestro CI docs](https://cloud.mobile.dev/ci-integration/github-actions#add-your-api-key-secret) |
| QR scans but app empty                  | No dev client on device                                  | Install development build first                                                                                   |
| `eas.json is not valid: "update" is not allowed` | Invalid top-level `update` key in eas-cli 19+     | Remove `update` block; channels live on build profiles (`channel` in each profile)                                |
| `pnpm prebuild:staging` fails           | Template staging/preview mismatch                        | Use `preview`                                                                                                     |
| Metro shows `exp+obytesapp://`          | Old dev client slug                                      | Rebuild dev client after slug change                                                                              |
| agent-device empty snapshot             | Missing a11y labels                                      | Add `accessibilityLabel` to buttons                                                                               |
| `tsc` fails in node_modules             | Broad `include` glob                                     | Narrow to `src/`**                                                                                                |
| Format changes committed files          | Prettier or wrong formatter                              | ESLint defaultFormatter + `.prettierignore`                                                                       |
| `Cannot use JSX unless --jsx flag`      | File outside tsconfig `include`                          | Exclude archive dirs; add explicit `"jsx": "react-native"`                                                        |
| `perfectionist/sort-exports` on save    | Not in ESLint fix-on-save                                | `source.fixAll.eslint: "always"` + perfectionist fixable                                                          |
| `.pnpm-store/` in project root          | Sandbox/agent `pnpm install` (global store not writable) | `rm -rf .pnpm-store`; gitignore + IDE exclude; not Obytes/Replit config                                           |


---

## 10. Backgammon Mastermind–specific notes

- Original Replit app preserved in `replit/` for reference
- Game engine: `src/lib/game/` (pure TS)
- UI + state: `src/features/game/`
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