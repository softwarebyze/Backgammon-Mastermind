# Tutor Guidance — Design

Unified design for tutor guidance: automatic end-of-turn blunder review
(Tutor Mode) and user-requested turn-start hints. Written Sep 2026
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
the feature properly, no hero exceptions. Mid-turn hints were descoped:
the engine plans a full roll, so the button is offered at turn start only.

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
- **Hint** (user taps Hint at turn start, before any checker has moved):
  opens in `solution` with the best move's arrows and a "Play this move"
  button. The game is NOT paused. Dismissing leaves the turn-start position.

### "The question" and the board

- Blunder `question` view: the live board shows the **blundered end position**
  (unchanged behavior — the mistake stays visible).
- Blunder `solution` view: the board shows a **display-only preview** of
  `questionState` (turn start) with two arrow sets: the player's path in
  orange, the best move in green, with a legend and per-set toggles. The live game
  state is untouched; closing the session removes the preview.
- Hint `solution` view: the board stays on the live turn-start position; the
  best move's arrows are drawn. The player can play that move or dismiss it.

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

- Severity follows the GNU Backgammon bands on the meter: Fine below 0.04,
  Slip 0.04–0.08, Mistake 0.08–0.16, Big blunder 0.16+. The tutor only opens
  a prompt at 0.05 or more, so a Slip between 0.04 and 0.05 is on the scale
  but not flagged.
- Question view: `"Your move was the 3rd-best of 18 ways to play this roll.
  It gives up about 0.11 points per game compared with the best move."` plus
  one explainer line: `"Points per game is the average points a move earns.
  Higher is better."` No recommended move, no table.
- Solution view: `"You played: 13/8 · 13/11"` / `"Best: 8/4 · 6/4"`, legend,
  toggles; a collapsed "Details" section holds the rank/loss explanation and
  the top alternatives with labeled columns (`+0.12 pts`, `−0.11 vs best`).
- Hint pill: `"Suggested move: 8/4 · 6/4"`, `"Play this move"`, and
  `"Back to my turn"`. If the engine cannot answer, the pill is not shown.

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
6. **Play this move is explicit.** The hint pill can play the suggested
   turn when the player taps it. Nothing plays a move on its own, and a
   failed engine never substitutes a different suggestion.
7. **Hints are turn-start only.** The engine plans the full roll. The tutor
   still judges only completed turns. One trigger each, no overlap.
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
- `index.ts` — the swap point: `primaryEngine` (bgsage). To swap engines,
  implement `GameEngine` and repoint `primaryEngine` here. Nothing else
  changes. There is no second engine for hints or verdicts.

Wiring:

- Hints: `getEngineHint(state)` asks `primaryEngine` only. A throw (module
  not linked, web load failed, over budget, or no decomposition) means the
  hint button offers nothing.
- Tutor: `analyzeTutorTurn(state, primaryEngine)`; the played turn's
  fingerprint comes from the same engine (`primaryEngine.boardAfterTurn`).
  Engine unavailable → null → silent. A guess is worse than no verdict.

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
- `src/features/game/components/hint-button.tsx` — turn-start, store-driven
- `src/features/game/engine-hint.ts` — `getEngineHint`, primary engine only
- `src/features/game/engine/` — the swappable engine seam:
  `types.ts` (`GameEngine` interface), `bgsage-engine.ts`,
  `index.ts` (the swap point: `primaryEngine`)
- `src/features/game/game-screen-controls.tsx` — Hint at turn start only
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
- `engine-hint.test.ts`: a fake engine answers or throws. The real wiring
  throws in Jest, where bgsage is not linked — no substitute suggestion.
- `sage-move-recovery.test.ts`: recovered moves for white and black, a hit,
  the bar, and bearing off, checked against `src/lib/game/moves.ts`.
- `tutor.test.ts`: `analyzeTutorTurn` takes a fake `GameEngine`; no
  native-module mocks.
- Natural browser run: turn-start hint; blunder → question →
  reveal (both moves) → back to question → take back; screenshots.
