# AGENTS.md

## Cursor Cloud specific instructions

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
pnpm check-all     # lint + type-check + lint:translations + test
```

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
