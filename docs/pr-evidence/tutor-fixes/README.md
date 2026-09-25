# Tutor fixes — evidence (2026-09-24)

Two bugs found by extensive browser QA of the unified tutor guidance, both
confirmed by the user before fixing.

## Bug 1: mid-turn hints silently fell back to the heuristic engine

`planSageTurnFull` analyzes with the original full dice, then maps the result
onto `remainingDice`. On any partial-turn position this throws
`SageEngineError: die mismatch while mapping sage move`, and the requested
hint silently used the permitted heuristic fallback. The mid-turn hint feature
therefore never delivered a primary-engine answer.

Decision (user-confirmed): **descope mid-turn hints**. The Hint button now
appears at turn start only (`isTurnStart` in `src/lib/game/moves.ts`). It can
return as its own PR later with a proper partial-turn planner.

- `bug1-midturn-heuristic-fallback.mp4` — H.264 screen recording of the bug:
  after playing 8/5 of a 3-1 roll, the Hint pill reads "Hint: 6/5" with
  `engineId: heuristic` instead of the primary engine.

## Bug 2: stale hint surfaced when the player moved mid-request

`createPlayMove` defers `setState` until the move animation finishes, but the
hint's invalidation guard keyed off `state`. A hint request that completed
after a move was initiated but before the animation committed would publish
guidance for the dead pre-move position.

Fix: `useHintRequest` in `hint-button.tsx` now also invalidates on
`isAnimating` false→true (move initiation, synchronous), in addition to
`state` changes. Verified: tapping Hint then moving immediately no longer
produces any pill (`fix-no-stale-pill.png`).

- `bug2-stale-hint-surfaces.mp4` — H.264 screen recording of the bug: the
  pill recommends "Suggested move: 8/5 · 6/5" after 8/5 was already played.

## Post-fix verification (all executed, Chromium 390×844, real WASM engine)

- `fix-turnstart-hint-bgsage.png` — turn-start hint uses `engineId: bgsage`,
  pill reads "Suggested move: 8/5 · 6/5".
- `fix-hint-hidden-midturn.png` — after one move, no Hint button is offered.
- `fix-no-stale-pill.png` — hint tapped, move played mid-request, 8s wait:
  no pill surfaces.
- `fix-blunder-takeback.png` — blunder review still opens ("Big blunder",
  16th of 16, ~0.42 pts/gm); "Take back & retry" restores dice [3,1].

Unit: `isTurnStart` covered in `src/lib/game/moves.test.ts` (full roll,
doubles, post-move, mid-doubles). Suites: 47 passed, 324 tests.
`tsc --noemit` clean, ESLint clean on changed files. Temporary QA hook fully
reverted before commit.
