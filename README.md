# QA evidence for PR #385 @ 303d40d

Expo SDK 58 upgrade. Preview: https://backgammon-mastermind-mlg4zrovq-softwarebyzes-projects.vercel.app (Vercel deployment for `303d40dd109aac23a915f81cc2d9c8c688525167`). Production (main): https://backgammon-mastermind.vercel.app (`90b6137`).

Playwright, fresh context per run, Chromium desktop 1280×800 plus WebKit iPhone 15 Pro. All `*posthog*` hosts aborted. Chromium cache disabled via CDP.

## Verdict

**FAIL (web drag regression).** Tap-to-move, dice-order taps, slow taps, Hint, Expert computer moves, Undo/Redo, Browser Back, Home/Learn/Settings, and engine/tutor parity are good on the preview and match production. Drag-and-drop of a checker does not complete on the preview, and does complete on production, with the same mouse path.

## Drag regression

Opening 3-1, drag the checker on point 8 to point 5. Identical bounding boxes and the same 30-step mouse path:

| build | Chromium | WebKit iPhone |
|---|---|---|
| #385 preview `303d40d` | 0/3 (plus 1 earlier board-suite run) | 0/3 (plus 1 earlier run) |
| production `90b6137` | 3/3 (plus 1 earlier run) | 3/3 (plus 1 earlier run) |

On the preview the checker is selected and legal destinations highlight, but the drop never commits (both dice still available, 167 pips). On production the 8/5 lands, the 3 is spent, and White is at 164 pips.

This is the gesture-handler 2 → 3 upgrade on web. I have not confirmed it with a physical mouse or trackpad; please try a drag by hand on the preview as well. Native drag on the plugged-in devices is still pending.

- Side-by-side: [drag-main-vs-pr-chromium.png](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/drag-main-vs-pr-chromium.png) · [drag-main-vs-pr-webkit.png](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/drag-main-vs-pr-webkit.png)
- Short clips: [preview](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/drag-preview-chromium-1.mp4) · [production](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/drag-prod-chromium-1.mp4)

## What passed (preview vs production)

- Home / Learn / Settings smoke, Chromium + WebKit, both sites.
- Tap-to-move (select point 8, tap 5, then 6/5) on all four combos.
- Rapid double Undo / double Redo after that 3-1.
- Dice-order: spend the 3 with 8/5, immediately tap 6/5; only the remaining 1 is used.
- Slow ~1s press-and-release taps (isolated retest): 6/5 on all four combos.
- Hint for opening 3-1 is `8/5 · 6/5` with arrows, both sites.
- Expert computer move runs and changes the board, both sites. No `pageerror`.
- Status labels: in-game, the on-roll label (“Your turn”) is visible immediately and switches correctly after the turn. In Position setup, both “On roll” and “Tap to put on roll” are visible at once.
- Browser Back: start from Home, play 8/5, Back (no `beforeunload` dialog), Resume restores 8/5. Passed on preview Chromium, preview WebKit, and production Chromium.

Position-editor stack drag/tap could not be driven reliably by Playwright’s mouse on either build (the editor uses a Manual gesture). That stays on the device pass. Scroll position stayed at 0 during the attempted drag.

## Engine and tutor parity (same 10 #394 positions)

[engine-parity.txt](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/engine-parity.txt) · [tutor-parity.txt](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/tutor-parity.txt)

5 Hint positions, 10/10 identical to production and to the #394 expected lines:

- std 3-1: `8/5 · 6/5`
- std 6-6: `13/7 · 13/7 · 24/18 · 24/18`
- mid 5-2: `13/8 · 6/4`
- mid 6-5: `24/18 · 18/13`
- race 4-4: `8/4 · 8/4 · 4/off · 4/off`

5 Computer (Expert) positions: preview and production played the same move in each case.

Tutor (non-best line, then the guidance modal): 5/5 matched production, including the same “You played” / “Best” moves and, where Details was opened, the same equities (std 3-1: ranked 6 of 16, 0.27 below best, best +0.23; mid 5-2: ranked 5 of 13, 0.46 below best, best +0.65).

[hint comparison](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/hint-main-vs-pr.png) · [tutor mid 5-2 with equities](https://raw.githubusercontent.com/softwarebyze/Backgammon-Mastermind/evidence/qa-pr-385-303d40d/tutor-details-preview-mid-52.png)

## Repo checks

Local `pnpm check-all` on `303d40d` (Node 22, pnpm 10.12.3): lint, type-check, type-check:scripts, translations lint, Jest **216 suites / 1,546 tests**, knip (exit 0; one configuration hint about `.css`).

## Logs

`qa-board.log`, `qa-retest.log`, `qa-parity.log` / `engine-parity.txt`, `qa-tutor.log` / `tutor-parity.txt`, `qa-back.log`, `check-all.log`.
