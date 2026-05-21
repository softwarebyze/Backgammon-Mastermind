# Backgammon

A fully playable backgammon mobile app with AI opponent and local 2-player mode.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo app (mobile dev server)
- Scan the QR code shown in the Expo workflow to play on a physical device via Expo Go

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with expo-router
- State: React context (no backend needed — pure client-side game)
- Fonts: Inter (@expo-google-fonts/inter)

## Where things live

- `artifacts/mobile/game/` — pure game engine (types, board, move generation, AI)
  - `types.ts` — all shared TypeScript types
  - `constants.ts` — initial board setup, state factory
  - `moves.ts` — legal move generation, move application, dice rolling
  - `ai.ts` — heuristic AI with recursive best-sequence search
  - `index.ts` — barrel re-export
- `artifacts/mobile/context/GameContext.tsx` — React context; manages state, AI automation via useEffect timers
- `artifacts/mobile/components/board/` — board rendering components
  - `BoardView.tsx` — root board layout (flex-based, bar spans full height)
  - `PointColumn.tsx` — individual triangle point with checker stack
  - `CheckerToken.tsx` — single checker with inner ring highlight
  - `BarArea.tsx` — center bar showing hit checkers
  - `BearOffArea.tsx` — borne-off checker column
  - `DiceDisplay.tsx` — animated dice showing used/unused state
- `artifacts/mobile/app/(tabs)/index.tsx` — home/menu screen
- `artifacts/mobile/app/game.tsx` — game screen (Stack screen, no header)

## Architecture decisions

- Game engine is pure TypeScript with no React dependencies — can be unit-tested in isolation or reused for a web client.
- AI uses greedy recursive search (depth = remaining dice count) with a composite board evaluation function covering pip count, blots, made points, primes, and bar/home counts.
- Dice deduplication: when equal dice values appear (e.g. `[3,3]`), legal move generation only produces one move per unique (from, to) pair to avoid duplicate UI options.
- AI turn automation runs entirely through `useEffect` in GameContext — no separate game loop or setTimeout pollution in the UI layer.
- Board layout uses a flex row with `flex: 6` side sections so the center bar and bear-off column span the full board height without absolute positioning hacks.

## Product

- Home screen: choose "vs Computer" (AI plays as Black) or "2 Players" (pass-and-play)
- Board: standard backgammon layout — White moves 24→1, Black moves 1→24
- Game flow: tap "Roll Dice" → tap your checker → tap highlighted destination → repeat
- Bar entry is enforced before other moves; bearing-off activates automatically when all checkers are home
- AI rolls and moves automatically with natural delays for readability

## Gotchas

- `getLegalMoves` returns bar-only moves when the current player has bar checkers — this is enforced in the game rules
- PointColumn triangles use the React Native CSS border trick (0×0 view with large border) — works on web + native
- `boardHeight` must be passed to BarArea/BearOffArea so they fill the exact board height in the flex row

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
