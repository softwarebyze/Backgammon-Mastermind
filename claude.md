> Backgammon Mastermind — forked from [Obytes React Native Template](https://github.com/obytes/react-native-template-obytes).

## What: Technology Stack

- **Expo SDK 56** with React Native 0.85.3
- **TypeScript** — strict mode
- **Expo Router 6** — file-based routing
- **Uniwind/Nativewind** — utility-first styling
- **MMKV** — local storage (theme, i18n)
- **Jest + React Testing Library** — unit tests

## What: Project Structure

```
src/
├── app/              # Routes: home (app)/index, game, settings
├── features/game/    # Backgammon UI + GameProvider
├── features/settings/
├── components/ui/    # Shared UI kit from Obytes template
├── lib/game/         # Pure TS game engine
├── lib/i18n/         # Translations
└── translations/

Root: env.ts, app.config.ts, docs/obytes-template-playbook.md
```

## How: Key Patterns

- **Game logic**: pure functions in `src/lib/game/` — no React imports
- **Game state**: `GameProvider` + `useGame()` in `src/features/game/`
- **Routes**: `src/app/(app)/index.tsx` (home), `src/app/game.tsx`, settings
- **Styling**: NativeWind/Tailwind classes on UI components; game board uses StyleSheet
- **Imports**: `@/` prefix always

## How: Essential Rules

- ✅ Keep game engine free of React/RN dependencies
- ✅ Use MMKV via `src/lib/storage.tsx` for persisted prefs
- ✅ Use EAS Build for native builds; EAS Update for PR JS previews
- ✅ Branding: `icon-source.png` → `pnpm brand:generate` → rebuild dev client; preview build to verify splash
- ❌ Do not modify `android/` or `ios/` directly — use Expo config plugins

See [Obytes Template Playbook](./docs/obytes-template-playbook.md) for CI, EAS, and fork upstream notes.
