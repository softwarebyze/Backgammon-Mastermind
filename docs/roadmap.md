# Product roadmap (long horizon)

Vision map (M0–M6). **Not** the sprint board — that is [GitHub Issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) (and [Releases](https://github.com/softwarebyze/Backgammon-Mastermind/releases) for what already shipped).

Inspired by [Backgammon.com Learn](https://backgammon.com/learn/board-setup-explained) and the chess.com bar for post-game analysis.

---

## Shipped earlier — Epic #50: Game review & automation

| Order | Issue | PR scope | Status |
|-------|-------|----------|--------|
| 1 | [#43](https://github.com/softwarebyze/Backgammon-Mastermind/issues/43) Show rolled dice when bar entry blocked | `no-move` phase + End Turn UX | Done (#56) |
| 2 | [#49](https://github.com/softwarebyze/Backgammon-Mastermind/issues/49) Replace swipe-back with intentional exit | Header back / confirm dialog | Done (#58) |
| 3 | [#47](https://github.com/softwarebyze/Backgammon-Mastermind/issues/47) Auto-roll dice (settings) | Gameplay helpers prefs | Done (#59) |
| 4 | [#48](https://github.com/softwarebyze/Backgammon-Mastermind/issues/48) Auto-move when only one legal move | Shared with #47 | Done (#59) |
| 5 | [#45](https://github.com/softwarebyze/Backgammon-Mastermind/issues/45) Full move history log | `move-log.ts` + options panel | Done (#60) |
| 6 | [#44](https://github.com/softwarebyze/Backgammon-Mastermind/issues/44) Undo / redo moves | Snapshot stack | Done (#88) |
| 7 | [#46](https://github.com/softwarebyze/Backgammon-Mastermind/issues/46) Replay scrubber | Timeline + path overlay | Done v1 (#88) |

---

## Milestone 0 — Ship quality bar (template fork + CI)

**Goal:** Every PR gets the same guardrails; fork notes live in `docs/obytes-template-playbook.md`.

| Item | PR scope | Status |
|------|----------|--------|
| Knip unused-export CI | `.github/workflows/knip.yml` + `knip.json` | Done |
| React Doctor advisory CI | `.github/workflows/react-doctor.yml` (#41) | Done |
| Bundle size delta on PR | `size-limit` or `@expo/bundle-analyzer` workflow | Planned |
| Screenshot diff CI (iPad, web, phone) | Argent / Percy + tablet landscape | Planned |
| Maestro recordings per release | `.maestro/app/` flows + artifact upload | 🟡 In progress |
| Perf regression (Flashlight / Sentry Performance) | Baseline on game screen | Planned |
| PostHog events schema | `src/lib/analytics/` | Planned |
| EAS metadata + Remotion launch videos | `eas metadata` + `remotion/` + GHA | Planned |
| `pnpm check-all` in PR template | Already partial | Done |

---

## Milestone 1 — Playable & trustworthy (MVP+)

**Goal:** Never lose a game; core UX feels intentional; beginners aren't lost.

**v0.1.1 (shipped)** — persistence, resume, opening roll, back-nav, checker slide animations, compound moves (#39), Maestro smoke with `roll-dice-button` testID. Evidence: `docs/evidence/v0.1.1/`.

| Item | PR | Status |
|------|-----|--------|
| **Game state persistence** (MMKV, resume on launch) | #34–#35 | Done |
| **Bear-off tappable** | #34 | Done |
| **Roll phase UX** — board doesn't steal focus; pulsing Roll CTA | #38 | Done |
| **Move hints toggle** — glow on stacks with legal moves | #38 | Done |
| **Single-movable pulse** — only one stack can move | #38 | Done |
| **Stack join preview** — ghost checker on press-in to legal stack | #38 | Done |
| **Direction overlay** — horseshoe path (like backgammon.com) | #38 | Done |
| **Tips banner** — rotating tips while waiting / rolling | #38 | Done |
| **Dice: numbers vs dots** setting | #38 | Done |
| **Responsive board** — `useWindowDimensions`, iPad max width | #38 | Done |
| **Settings** from home + game prefs section | #38 | Done |
| **Checker slide animation** (single + capture + bear-off) | #38 | Done |
| **Compound dice moves** — one tap uses both dice | #39 | Done |
| **Opening roll** — correct first player | #37 | Done |
| **Back navigation** — game state preserved | #36 | Done |
| **Game logic unit tests** (`moves.ts`, pip count, bear-off, animation layout) | various | Done |
| **Dice roll shuffle animation** | #40 | Done |
| **Blocked bar dice visibility** | #43 | Done (#56) |
| **Landscape** layout pass + screenshot | Planned | |

---

## Milestone 2 — Learn Backgammon (Duolingo layer)

| Item | Notes |
|------|-------|
| Lesson modules | Board setup, direction, hitting, bearing off, doubling |
| Interactive "Try it" boards | Like [bearing off tutorial](https://backgammon.com/learn/) |
| Quizzes | Multiple choice at end of lessons |
| **Puzzles** | "Find the best move" — local positions |
| Full-screen **movement compass** | Color, home board, START→HOME |
| Animations | Hit → bar, bear-off, game start/end (Fruit Ninja energy) |
| Tips as loading states | Queue from `src/lib/game/tips.ts` |

---

## Milestone 3 — Mastermind (analysis & history)

| Item | Notes |
|------|-------|
| Move history + **save/replay** (local) | JSON in MMKV — issues #45, #46 |
| **Undo / redo** | Linear stack — issue #44 |
| Post-game **blunder summary** | Compare to AI top move |
| Session **statistics** | Win rate, gammons, cube decisions |
| Advanced stats dashboard | Pip equity trends, doubling mistakes |
| **In-game coach chat** (local-first, free) | On-device Q&A + position explain — no API fees |
| AI chat after game | Optional LLM upgrade later; local coach ships first |

---

## Milestone 4 — Growth & polish

| Item | Notes |
|------|-------|
| Shareable screens / deep links | Viral puzzle of the day |
| Remotion marketing assets | GHA renders on release |
| Social automation | Optional GHA → buffer |
| Deep design review pass | Motion, sound, haptics, turn transitions |
| Support flow improvements | In-app help, FAQ |

---

## Milestone 5 — Platform expansion

| Item | Notes |
|------|-------|
| Apple Watch companion | Pip count, turn notify |
| iMessage extension | Challenge friend |
| **Board photo setup** | Vision camera + [BackgammonCV](https://github.com/christiancorro/BackgammonCV) hologram overlay |
| Web desktop layout | Centered board, keyboard shortcuts |

---

## Milestone 6 — Competitive / boot.dev mode

| Item | Notes |
|------|-------|
| Ranked puzzles streak | XP, daily goal |
| Curriculum paths | Beginner → intermediate (Woolsey doubling, etc.) |
| Match play scoring | Crawford rule teaching |

---

## PR discipline

1. **One concern per PR** — e.g. persistence alone, hints alone.
2. **Tests required** — Jest for logic; Maestro for flows; screenshots for visual.
3. **Feature flags / settings** — risky UX (hints, overlays) default **on** for beginners, off for speed-run testing via settings.
4. **No scope creep** — if a PR grows past ~400 lines, split.
5. **Verification in PR body** — include test output table + Maestro screenshots when UI changes.

---

## References

- [Board setup & direction](https://backgammon.com/learn/board-setup-explained)
- [When to double](https://backgammon.com/learn/when-to-double)
- [BackgammonCV](https://github.com/christiancorro/BackgammonCV) — board recognition research
