# Issue board (lightweight)

GitHub Projects need `read:project` scope (`gh auth refresh -s read:project`). Until then, use this doc + [open issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) filtered by label.

## Now — v0.1.2 ship (#63)

| Issue | Title |
|-------|--------|
| **#85** | **Epic: UX audit & polish** — see `docs/UX-AUDIT.md` |
| #64 | Compound moves — device verify |
| #65 | Leave/resume — device verify |
| #70 | Nav stack swipe back |
| #72 | Web checker shadow |

## In progress — Game UI polish

| Issue | Title | Notes |
|-------|--------|-------|
| #46 | Replay scrubber | Chess.com-style ◀/▶ bar + board rewind |
| #69 | Move history v2 | Merged into scrubber work |
| #71 | Settings icons | Section groups + active icon colors |
| #49 | Intentional exit | Silent save-and-exit (no alert) |
| #68 | Board layout | Bar groove, dice placement |
| #66 | Dice animation | Roll polish |
| #74 | Dice → timeline | After scrubber stable |

## Next — Delight & growth

| Issue | Title |
|-------|--------|
| #84 | Board point numbers (new) |
| #44 | Undo/redo |
| #75 | Audio (deferred until core solid) |
| #78 | Sentry + PostHog |
| #77 | A11y audit |

## Process

| Issue | Title |
|-------|--------|
| #83 | PR QA gate + CodeRabbit |
| #50 | Epic: game review & automation |

## Releases

See [releases.md](./releases.md). **Current target:** v0.1.2 TestFlight after device QA on #61 fixes.
