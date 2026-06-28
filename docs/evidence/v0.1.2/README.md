# v0.1.2 QA evidence

Release candidate for review polish, move timeline, opening-roll stability, and settings UX.

**PR:** [#88](https://github.com/softwarebyze/Backgammon-Mastermind/pull/88)  
**Vercel preview:** [backgammon-mastermind-git-feat-mo-2b8ff9](https://backgammon-mastermind-git-feat-mo-2b8ff9-softwarebyzes-projects.vercel.app)

---

## 1. Timeline dot spacing

| | Screenshot |
|---|------------|
| **Before** — uneven gaps at turn boundaries (extra `turnSep` + flex `gap` stacked) | [`timeline-spacing/before-uneven-dots.png`](./timeline-spacing/before-uneven-dots.png) |
| **After** — uniform `SLOT` + `GAP` between every ply (no turn separators) | Re-verify on device after merge; spacing math is now identical between all dots |

**Root cause:** Turn-boundary spacers (`turnSep` / `marginLeft`) were added *on top of* flex `gap: 6`, so gaps at turn changes were ~10–16px while within-turn gaps were 6px.

**Fix:** `move-review-bar.tsx` — every dot uses the same `slot` width (`16px`) and `marginRight: 6px`; removed all turn separators.

**Note on the dark dot:** When a move is focused in review, that ply renders as a mini **checker token** (black player → dark checker). This is intentional, not a stray indicator.

---

## 2. New-game / opening-roll die flash

| | Screenshot |
|---|------------|
| **Before** — white opening die positioned near bear-off (read as glitch) | User report + prior `OpeningRollOverlay` using `boardWidth - bearOffWidth` for white |
| **After** — opening dice on left margin (black top, white bottom); review state cleared on reset | [`opening-roll/after-reset-game.png`](./opening-roll/after-reset-game.png) |

**Root causes:**
1. `OpeningRollOverlay` placed white’s die on the right edge beside bear-off.
2. Review scrubber state (`manualIndex`, `reviewAnimation`) was **not** cleared when `moveLog` reset → stale animation could flash after reset/new game.
3. `DiceDisplay` scale animation could carry over when dice returned to `[0,0]`.

**Fixes:**
- `opening-roll-overlay.tsx` — both dice on left inset (no bear-off overlap).
- `use-move-review.ts` — `useReviewResetOnLogClear` calls `goLive()` when log clears.
- `game-provider.tsx` — `resetAnimation()` on `startGame` / `resetGame`.
- `dice-display.tsx` — reset `dieScale` when dice are `[0,0]`.

---

## 3. Dice display settings (no double border)

| | Screenshot |
|---|------------|
| **Before** — outer card border around dice picker section | Settings → Game → dice display wrapper had `borderWidth: 1` |
| **After** — section wrapper border removed; per-option cards keep their own border | `game-preferences-panel.tsx` `diceCard` style |

---

## 4. Review UX (regression guard)

- **Back to live game** — full text button in `GameScreenControls` during review (unchanged).
- **Forward chevron** at last move exits review (`stepForward` → `goLive`).
- **Turn labels** — `Turn 2/5 · move 1/2 · White` via `formatReviewPositionLabel`.

Evidence from prior PR pass: [`../review-ui/`](../review-ui/), [`../move-path-arrow/`](../move-path-arrow/).

---

## 5. Marketing / Remotion (v0.1.2)

Rendered with `cd remotion && pnpm render:all`:

| Asset | Path |
|-------|------|
| Launch hero (9:16) | [`../../marketing/v0.1.2/launch-hero.mp4`](../../marketing/v0.1.2/launch-hero.mp4) |
| App Store preview (16:9) | [`../../marketing/v0.1.2/app-store-preview.mp4`](../../marketing/v0.1.2/app-store-preview.mp4) |
| Social square | [`../../marketing/v0.1.2/feature-spotlight.mp4`](../../marketing/v0.1.2/feature-spotlight.mp4) |

Also copied to [`../../remotion/after/`](../../remotion/after/).

---

## Verification checklist

- [x] `pnpm test` (122 tests)
- [x] `pnpm type-check`
- [x] Knip unused **exports** from PR scope fixed
- [x] iOS simulator smoke via Argent (home → 2-player → board → Metro reload)
- [x] Remotion `render:all`
- [ ] Maestro E2E on CI after push
- [ ] Vercel preview spot-check (web game playable)

**Known skip:** Expo PR Preview workflow may fail until July 1 (plan minutes) — Vercel preview is the web QA path.
