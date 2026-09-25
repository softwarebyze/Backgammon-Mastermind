# Tutor Guidance — Design

Unified design for tutor guidance: automatic end-of-turn blunder review
(Tutor Mode) and user-requested mid-turn hints. Written Sep 2026
from Zachary's feedback; the goal is one coherent feature, not accumulated
one-off exceptions.

## What was wrong before

Two separate "hint" systems with inconsistent UX:

- `HintButton`: only offered at turn start (hidden after the first move
  by a `noMovesPlayedYet` gate), showed the full answer inline, one arrow
  color, local component state.
- `TutorBlunderModal`: end-of-turn only, revealed Sage's recommended move
  (`"Sage preferred 8/4 · 6/4"`) and a raw candidate-equities table
  immediately, "Hint" jumped back to turn start + arrows.

Zachary's asks: (1) hint mid-turn after 1/2 or 1–3/4 moves; (2) get back to
the question after viewing the solution; (3) beginner-clear messages,
especially the numbers; (4) documented, reviewable; (5) see my move and the
recommended move at the same time, with good choice UX; (6) don't reveal the
recommended move at first — let the player try to figure it out; (7) build
the feature properly, no hero exceptions.

## Core model: `GuidanceSession`

One session type in `guidance-store.ts` covers both flows. The session is the
single source of truth; the modal (blunder) and the inline pill (hint) are
views over it.

```ts
type GuidanceKind = 'blunder' | 'hint';

type GuidanceSession = {
  id: number;
  kind: GuidanceKind;
  /** The position the user is deciding from — "the question". */
  questionState: GameState;   // blunder: turn start · hint: position at request
  /** The user's moves from questionState (full turn / moves so far). */
  myMoves: Move[];
  /** The engine's recommended moves from questionState. */
  engineMoves: Move[];
  /** Solution visible? Blunder starts false (progressive disclosure); hint starts true. */
  revealed: boolean;
  /** Which arrow sets the solution view draws. */
  showMine: boolean;
  showEngine: boolean;
  /** Blunder-only verdict facts (for copy). */
  verdict?: { loss; playedRank; candidateCount; candidateEquities; bestEquity };
  /** Hint-only: GameEngine.id of the engine that answered. */
  engineId?: string;
  /** Hint-only: moveLog length when requested (for follow-along arrows). */
  hintMoveLogLength?: number;
};
```

### State machine

```
idle ── blunder found ──▶ question ── reveal ──▶ solution ── back ──▶ question
 │                         │  │                    │  │
 │                         │  └─ take back ──▶ idle (turn start restored)
 │                         └─ keep ──▶ idle    └─ keep ──▶ idle
 │
 └── hint asked ──▶ solution ── dismiss ──▶ idle   (non-blocking; game continues)
```

- **Blunder** (auto, end of turn, Tutor Mode on): opens in `question`.
  The game is paused while any blunder session is open (existing `tutorPaused`
  semantics). The recommended move is NOT shown until the player taps
  "Show the best move".
- **Hint** (user taps Hint during their moving phase): opens in `solution`
  with the best move's continuation arrows. The game is NOT paused — the player keeps
  playing. Dismissing returns to the exact mid-turn position ("the question").

### "The question" and the board

- Blunder `question` view: the live board shows the **blundered end position**
  (unchanged behavior — the mistake stays visible).
- Blunder `solution` view: the board shows a **display-only preview** of
  `questionState` (turn start) with two arrow sets: the player's path in
  orange, the best move in green, with a legend and per-set toggles. The live game
  state is untouched; closing the session removes the preview.
- Hint `solution` view: the board stays on the live mid-turn position; only
  the best move's continuation arrows are drawn (the player's moves so far are already
  visible as the board position).

### Arrow derivation (no stored segments)

Arrow segments are **derived** from `(session, liveState, moveLog)` on every
render — never stored — so they can never go stale:

- Hint: prefix-match `engineMoves` against moveLog entries made after the
  request (by from/to); drop played ones; re-resolve the rest against the
  live position (`hintMovesToSegments` stops at the first illegal move, so a
  deviation degrades gracefully). Undo re-shows arrows — correct, since the
  position is back.
- Blunder solution: both full-turn paths re-resolved from `questionState`.
- `PathSegment.tone: 'mine' | 'engine'` picks the arrow color.

## Copy: beginner-first numbers

**Naming:** user-facing copy never personifies the engine — it says
"the best move" / "Best:" / "Suggested move". Internals don't name an
engine either (see "Engine swap point" below): fields are `engineMoves`,
`showEngine`, `engineId`, and the hint entry is `getEngineHint`. The
engine's own package (`expo-bgsage`) keeps its internal names; that's the
engine's business, not the app's.

Old: `"Your move ranked #3 of 18 (−0.11). Sage preferred 8/4 · 6/4."` plus a
raw `#1 +0.12 best` table. Problems: unexplained units, unexplained rank,
answer spoiled immediately.

New principles: **words first, one explained number, details collapsed.**

- Severity from equity loss: ≥ 0.15 "Big blunder", ≥ 0.08 "Mistake", else
  "Small slip" (flag threshold stays 0.05).
- Question view: `"Your move was the 3rd-best of 18 ways to play this roll.
  It gives up about 0.11 points per game compared with the best move."` plus
  one explainer line: `"Points per game is the average points a move earns.
  Higher is better."` No recommended move, no table.
- Solution view: `"You played: 13/8 · 13/11"` / `"Best: 8/4 · 6/4"`, legend,
  toggles; a collapsed "Details" section holds the rank/loss explanation and
  the top alternatives with labeled columns (`+0.12 pts`, `−0.11 vs best`).
- Hint pill: `"Suggested move: 8/4 · 6/4"` + `"Back to my turn"`; heuristic
  fallback is labeled `"Hint: …"`.

## Decisions (explicit, so they don't become exceptions later)

1. **Hint shows the answer directly; blunder doesn't.** Tapping Hint is an
   explicit request — the answer is the point. The blunder prompt is
   unsolicited, so it must not spoil the puzzle.
2. **Hint never pauses the game.** It's advice on the live position; the
   verdict hold stays exclusive to the auto tutor path.
3. **Hint arrows follow the player** (derived per render, § Arrow derivation)
   instead of vanishing on the first move — a 3-move suggestion stays useful.
4. **Hint works with Tutor Mode off.** Hints are a general feature; only
   the auto blunder prompt is tutor-gated.
5. **Stale hint requests are discarded.** If the player moves while "Finding
   the best move…" is in flight, the result is dropped — an answer for a dead position
   is worse than none.
6. **No auto-play.** Nothing ever substitutes the recommended move for the player's,
   in either flow (unchanged rule).
7. **No mid-turn auto-review.** The tutor still judges only completed turns;
   the hint button is the mid-turn instrument. One trigger each, no overlap.
8. **The engine is swappable, not branded.** The tutor and hints talk only to
   the `GameEngine` interface (`planTurn` + `boardAfterTurn`); no feature code
   names an engine, and no user-facing copy personifies one.

## Engine swap point

`src/features/game/engine/` is the one place that knows which engine is
which:

- `types.ts` — `GameEngine`: `id` (stable, never user-facing), `planTurn`
  (best plan + all candidates, best-first; throws when unavailable),
  `boardAfterTurn` (position fingerprint in the same space as the
  candidates' boards, so the tutor can rank the played turn).
- `bgsage-engine.ts` — the bgsage neural-net engine behind the interface.
  Owns the expo-bgsage import and the "no usable plan" validation.
- `heuristic-engine.ts` — the built-in greedy AI behind the interface.
  Single candidate, equity 0: good enough for suggestions, never for
  blunder verdicts.
- `index.ts` — the swap point: `primaryEngine` (bgsage) and `fallbackEngine`
  (heuristic). To swap engines, implement `GameEngine` and repoint
  `primaryEngine` here. Nothing else changes.

Wiring:

- Hints: `getEngineHint(state)` tries `[primaryEngine, fallbackEngine]` in
  order and reports which `engineId` answered (the pill says "Suggested move"
  for the primary engine, "Hint" for a fallback).
- Tutor: `analyzeTutorTurn(state, primaryEngine)`; the played turn's
  fingerprint comes from the same engine (`primaryEngine.boardAfterTurn`),
  so judging stays consistent. Engine unavailable → null → silent, same as
  before; the tutor never falls back to the heuristic (a guessy verdict is
  worse than none).

Tests inject fake engines directly (`getEngineHint(state, [fake])`,
`analyzeTutorTurn(state, fake)`) — no native-module mocks for these paths.
Only `use-tutor-hold.test.tsx` still mocks `expo-bgsage` (it exercises the
real wiring), via a path-based mock of `expo-bgsage/src/index`.

## Lifecycle

- Blunder session: created by `useTutorMode` at turn end (judged); cleared on
  take-back / keep / turn-off / new game / reset / unmount / tutor disabled.
- Hint session: created by the Hint button on engine response; cleared on
  dismiss, turn change (new dice), new game / reset / unmount. Clearing is
  keyed on `kind`, so ending a turn never nukes a blunder prompt.
- `verdictPending` (cold-engine hold) is unchanged.

## Files

- `docs/tutor-guidance/DESIGN.md` — this file
- `src/features/game/guidance-store.ts` — session + verdictPending (renamed from `tutor-store.ts`)
- `src/features/game/guidance-copy.ts` — severity, messages, ordinals (pure)
- `src/features/game/guidance-arrows.ts` — segment derivation (pure)
- `src/features/game/components/guidance-modal.tsx` — blunder modal (replaces `tutor-blunder-modal.tsx`)
- `src/features/game/components/hint-button.tsx` — mid-turn, store-driven
- `src/features/game/engine-hint.ts` — `getEngineHint`, tries engines in order
- `src/features/game/engine/` — the swappable engine seam (see below):
  `types.ts` (`GameEngine` interface), `bgsage-engine.ts`, `heuristic-engine.ts`,
  `index.ts` (the swap point: `primaryEngine` / `fallbackEngine`)
- `src/features/game/game-screen-controls.tsx` — Hint available all human moving phase
- `src/features/game/game-screen.tsx` / `game-screen-layout.tsx` — wiring, preview override, pause semantics
- `src/features/game/use-tutor.ts` — builds blunder sessions (now with `myMoves`), clears stale hint sessions

## Testing

- `guidance-copy.test.ts`: severity boundaries; question copy never contains
  the recommendation; ordinals.
- `guidance-arrows.test.ts`: follow-along prefix matching; deviation
  degradation; undo re-show; blunder both-paths from turn start.
- `guidance-store.test.ts`: session lifecycle, reveal/back/toggles.
- `guidance-modal.test.tsx`: question hides answer; reveal shows both paths;
  back-to-question; take-back reverts; keep/turn-off.
- Existing tutor tests updated for the rename (`useTutorBlunder` →
  `useGuidance`, etc.).
- `engine-hint.test.ts`: fake engines (primary/fallback/skip/throw) plus the
  real wiring — bgsage unavailable in Jest, so the heuristic answers.
- `tutor.test.ts`: `analyzeTutorTurn` takes a fake `GameEngine`; no
  native-module mocks.
- Natural browser run: mid-turn hint after 1/2 moves; blunder → question →
  reveal (both moves) → back to question → take back; screenshots.
