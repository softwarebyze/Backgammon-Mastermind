> Backgammon Mastermind — forked from [Obytes React Native Template](https://github.com/obytes/react-native-template-obytes).

## What: Technology Stack

- **Expo SDK 57** with React Native 0.86.3
- **TypeScript** — strict mode
- **Expo Router 57** — file-based routing
- **Uniwind/Nativewind** — utility-first styling
- **MMKV** — local storage (theme, i18n, saved games)
- **Jest + React Testing Library** — unit tests
- **bgsage (GNU Backgammon WASM)** — Sage engine for tutor guidance and vs-computer play

## What: Project Structure

```
src/
├── app/              # Routes: (app)/index (home), game/, (app)/settings.tsx, (app)/learn/, language, developer
├── features/game/    # Backgammon UI + GameProvider
├── features/tutor/   # Tutor guidance (Sage engine suggestions)
├── features/learn/   # Learn to Play curriculum
├── features/settings/
├── components/ui/    # Shared UI kit from Obytes template
├── lib/game/         # Pure TS game engine
├── lib/analytics/    # PostHog events
├── lib/i18n/         # i18n setup
└── translations/     # 17 locales

Root: env.ts, app.config.ts, docs/obytes-template-playbook.md
```

## How: Key Patterns

- **Game logic**: pure functions in `src/lib/game/` — no React imports
- **Game state**: `GameProvider` + `useGame()` in `src/features/game/`
- **Routes**: `src/app/(app)/index.tsx` (home), `src/app/game/` (game screen), `src/app/(app)/settings.tsx`
- **Styling**: NativeWind/Tailwind classes on UI components; game board uses StyleSheet
- **Imports**: `@/` prefix always

## How: Essential Rules

- ✅ Keep game engine free of React/RN dependencies
- ✅ Use MMKV via `src/lib/storage.tsx` for persisted prefs
- ✅ Use EAS Build for native builds; EAS Update for PR JS previews
- ✅ Branding: `icon-source.png` → `pnpm brand:generate` → rebuild dev client; preview build to verify splash
- ❌ Do not modify `android/` or `ios/` directly — use Expo config plugins

See [Obytes Template Playbook](./docs/obytes-template-playbook.md) for CI, EAS, and fork upstream notes.
