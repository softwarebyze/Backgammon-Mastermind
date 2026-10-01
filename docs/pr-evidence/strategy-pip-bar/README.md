# Strategy + Pip Bar — Visual Evidence (390×844)

Captured 2026-09-24 via headless Chromium against local Expo web (`http://localhost:8089`).

- `00-home.png` — Home screen (baseline).
- `01-strategy-pip-bar.png` — New slim status bar above the board: strategy pill
  ("Developing") on the left, race pip counts ("167 · 167") on the right.
- `02-strategy-tip.png` — Tapping the pill reveals the one-line execution tip
  ("Build points, fight for the 5-point, and stay flexible.").

Automated coverage: `src/features/game/strategy.test.ts` (10 tests),
`src/features/game/components/game-pip-status-bar.test.tsx` (3 tests).
Full suite: 478/478 pass. tsc, ESLint, knip clean.
