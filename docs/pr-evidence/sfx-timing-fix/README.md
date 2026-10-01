# SFX Timing Fix — Evidence

## Problem
Move sound effects (especially bear-off) felt "late" on web. Measured tap→sound
at **~396ms**: the SFX trigger lived in `handleMoveRecorded`, which runs at
animation settle (~360ms slide + ~36ms React/settle overhead). Under CPU load,
sequenced sounds degraded further — the win sound's `setTimeout(40)` stagger
blew out to **652ms** after the bear-off sound because the main thread was
blocked by the win ceremony's React re-render.

## Fix
Play move SFX at animation start via a new `onMoveStarted` callback
(`createPlayMove` → `useAnimatedMoves` → provider `handleMoveStarted`), instead
of at settle in `handleMoveRecorded`. The `after` state is a pure `applyMove`
preview, identical to what settle commits. As a side benefit, the win stagger
now fires before the expensive settle work, so it holds at 40ms even under load.

## Measured (real Chromium 390×844, Expo web, warmed Web Audio)

| Stage | Before | After |
|---|---:|---:|
| Tap → bear-off SFX call | ~396ms | **+0.9ms** |
| Tap → audible buffer start | ~396ms | **+1.1ms** |
| Bear-off → win sound | 40ms (153ms–652ms under load) | **42ms** |

The checker slide animation (360ms) is unchanged; only the audio trigger moved.

## Verification
- 461/461 Jest tests pass (79 suites), including 4 new `create-play-move`
  tests covering: `onMoveStarted` fires synchronously before settle, preview
  `after` equals the committed state, illegal moves don't fire it, and settle
  still commits without the callback.
- `tsc --noEmit`, ESLint (changed files), and knip clean.
- Rendered QA at 390×844 (`game-board-390x844.png`).

## Files changed
- `src/features/game/create-play-move.ts` — new `onMoveStarted` opt, fired
  synchronously before `setMoveAnimation`.
- `src/features/game/play-validated-move-sequence.ts` — glide path fires
  `onMoveStarted` per step at glide start.
- `src/features/game/use-animated-moves.ts` — threads callbacks through
  (options object); extracted `armFinish` helper.
- `src/features/game/use-game-provider-value.ts` — `handleMoveStarted`
  plays `playGameSfxSequence`; `handleMoveRecorded` keeps move log/timeline.
