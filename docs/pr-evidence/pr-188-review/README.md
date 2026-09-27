# PR #188 review findings — fix evidence

Addresses the five review findings raised on [PR #188](https://github.com/softwarebyze/Backgammon-Mastermind/pull/188)
(`7d86e36`), all reproduced before the fix and re-verified after.

Board coordinate contract, which three of the findings depend on: React Native
mirrors the board's flex rows itself in an RTL locale, so the rendered board is a
left-right reflection of the LTR geometry. Every board-local x that reaches the
screen (or arrives from a touch) has to cross that mirror exactly once. The fix
puts that behind a single `BoardDimensions.rtl` flag plus a private `mirrorX()`
in `board-point-layout.ts`, rather than mirroring at each call site.

## 1. P1 — pass-and-play tutor hold was dropped (race)

`use-tutor.ts` tracked one turn at a time. When a verdict was being held and
pass-and-play handed the turn to the other human, the new turn overwrote the
tracked entry, so the in-flight verdict was silently discarded and the game sat
frozen until `VERDICT_PENDING_TIMEOUT_MS`.

Fix: a hold owns the pause until its verdict lands, and `abandonTurn()` bumps a
`holdEpoch` so the blocked turn starts its own analysis on release.

- Test: `src/features/game/use-tutor-hold.test.tsx` (`passAndPlayState()` flips
  the current player while a verdict is held).
- **Red:** `Expected: false`, `Received: true` — the held verdict was lost.
- **Green:** 6/6 pass.
- Runtime: the race is engine-timing dependent and cannot be forced through the
  UI on demand, so the deferred-promise unit test is the proof, not a screenshot.

## 2. P1 — RTL board geometry was not mirrored

Touches and overlays used LTR board-local x against a natively mirrored board, so
drags, hit tests, previews, the bear-off, and the direction lane all landed on the
wrong side in Arabic.

Fix: `BoardDimensions.rtl` flows from `useBoardDimensions` (via `isRTL`) into
`mirrorX()` for checker anchors and `resolveDropTarget`, and `DirectionOverlay`
reflects its lane with `translate(width 0) scale(-1 1)`.

- Tests: `src/features/game/board-rtl.test.ts` (11) and
  `src/features/game/components/board/direction-overlay-rtl.test.tsx` (3).
- **Red:** neutering the mirror failed 7/11 board tests.
- **Green:** 14/14 pass.
- Runtime (iPhone 17 Pro, Arabic, board 394x254): `DirectionOverlay` props showed
  `player: "black"`, `rtl: true`, and the SVG `G` carried
  `transform: "translate(394 0) scale(-1 1)"`.
- Runtime: RTL drag 19→20 moved a black checker (point 19: 4→3, point 20: 0→1),
  and the bear-off stack rendered on the physical left.
- `before-01-rtl-direction-overlay.png` → `after-01-rtl-direction-overlay.png`
- `before-02-rtl-hint-arrows.png` → `after-02-rtl-hint-arrows.png`

## 3. P2 — strategy copy was hardcoded English

`classifyStrategy` returned English `label`/`tip`/`why` strings built with template
literals, so the coaching line could not be localized.

Fix: `StrategyInfo` now returns `{ key, reason }`, where `reason` is a
`StrategyReasonKey` plus interpolation params. `GamePipStatusBar` resolves
`game.strategy.label.*`, `game.strategy.tip.*`, `game.strategy.why.*`,
`game.strategy.close_a11y`, and `game.strategy.got_it` through `translate()`. The
blitz reason splits into bar/blot singular-plural variants instead of pre-joined
English fragments.

- Tests: `src/features/game/strategy.test.ts` and
  `src/features/game/components/game-pip-status-bar.test.tsx` assert key identity
  so the assertions hold for every locale.
- **Green:** part of the 536-test run below; both suites fail if a strategy string
  is inlined again.
- Runtime: strategy line and expanded modal resolve labels/reasons/tips, close
  button reads `Got it` with accessibility label `Close strategy explanation`, and
  the chevron flips to `◂` in RTL.
- `after-03-strategy-modal-rtl.png`
- **Pending:** the new keys are listed in `PENDING_TRANSLATION_KEYS` and in the
  `i18n-json/ignore-keys` lint setting, so non-English locales fall back to
  English until a native speaker checks the backgammon terminology. The Arabic
  screenshots therefore show English copy by design, which also proves the
  fallback path works.
- **Left alone on purpose:** the hint button label `Get a move hint`
  (`src/features/game/components/hint-button.tsx`) is still hardcoded English,
  matching the explicit decision in `game-preferences-panel.tsx` that hint/tutor
  copy stays English on the demo branch. Flagged here rather than translated
  unilaterally.

## 4. P2 — stale `dieIndex` could consume the wrong die or nothing

`Move.dieIndex` indexes `state.remainingDice` *as planned*. A full-turn sequence
(engine plan, hint, or a stored compound path) is played move by move, so the
array shrinks between steps; a planned index can point past the end, and
`splice(move.dieIndex, 1)` then eats nothing and leaves the turn unfinishable —
or eats the wrong die when the index happens to still be in range.

Fix: `Move.die` carries the pip value, `getLegalMoves()` emits it, and
`applyMovePhysical` consumes through `resolveDieIndex()`, which prefers the die
value and returns `-1` (consume nothing) when the die cannot be identified. The
Sage adapter no longer casts `plan.moves as Move[]`; it copies fields explicitly.

- Test: `src/lib/game/compound-animation.test.ts` — a stale `dieIndex` with a
  matching `die` consumes the right die and leaves `[]`; an out-of-range index
  with no `die` consumes nothing and leaves `[2, 5]`; the stored sequence
  re-resolves correctly.
- **Green:** 3/3 pass. (This test previously asserted the buggy behaviour, so it
  documents the defect rather than failing on it — the failing form of the
  assertion is the one now in place.)
- Runtime (Arabic pass-and-play, fresh game, opening roll 4·6): point 17 selected
  with legal targets 21 (die 4) and 23 (die 6); playing 17/21 consumed the 4, and
  the follow-up 17/23 consumed the 6. Board ended point 17 = 1, point 21 = 1,
  point 23 = 1, tray `EmptyDiePlaceholder` ×2, turn passed to white, turn chip
  `4·6`. Each move spent the die it claimed, and `remainingDice` drained fully.
- `after-05-die-consumption-4-6.png`
- No before screenshot: the pre-fix failure needs a stale index from a stored or
  foreign plan, which cannot be staged from the live UI. The regression test is the
  before/after record.

## 5. P3 — native engine verification skipped most changed files

`.github/workflows/bgsage-verify.yml` ran `pnpm type-check` over the whole app and
built both native targets, but its `paths` filter named only a handful of specific
entries and silently skipped ~110 changed files per PR, including the Maestro
runner and the shared CI actions the workflow calls.

Fix: the filter now covers `.github/**`, `.maestro/**`, `expo-bgsage/**`,
`scripts/**`, `src/**`, the app/babel/metro configs, both tsconfigs, and the
lockfile.

- Evidence: the workflow diff plus a path-list check showing the previous filter
  excluded the files the job actually depends on.

## Validation

- `pnpm check-all` green on the final tree: lint (0 errors, 7 pre-existing
  warnings, all in untouched files), `tsc` for `tsconfig.json` and
  `tsconfig.test.json`, translation JSON lint, **93 suites / 536 tests**, and knip
  clean (only the `.css` configuration hint, which is informational).
- Runtime evidence above was captured on the native iOS development client
  (`com.backgammonmastermind.development`, iPhone 17 Pro, iOS 26.5) in Arabic via
  Metro.
- No native sources changed (nothing under `ios/`, `android/`, or
  `expo-bgsage/plugin`, and no `app.config.ts` change), so a native rebuild cannot
  regress; the new bundle was exercised on-device instead.
- The tutor race has no deterministic UI reproduction, and the two P2 findings
  are covered by unit tests plus the runtime checks above rather than by
  before/after screenshots.
