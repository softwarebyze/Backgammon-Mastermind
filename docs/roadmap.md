# Backgammon Mastermind — Product Roadmap

Organized milestones for shipping incrementally without bloating the app. Each milestone maps to **one or more small PRs** with tests, Maestro flows, and (where UI changes) screenshot diffs.

Inspired by [Backgammon.com Learn](https://backgammon.com/learn/board-setup-explained) — direction visuals, interactive lessons, quizzes — and the chess.com bar for post-game analysis.

---

## Milestone 0 — Ship quality bar (template fork + CI)

**Goal:** Every PR gets the same guardrails; fork notes live in `docs/obytes-template-playbook.md`.

| Item | PR scope | Status |
|------|----------|--------|
| Knip unused-export CI | `.github/workflows/knip.yml` + `knip.json` | 🟡 In progress |
| Bundle size delta on PR | `size-limit` or `@expo/bundle-analyzer` workflow | Planned |
| Screenshot diff CI (iPad, web, phone) | Argent / Percy + tablet landscape | Planned |
| Maestro recordings per release | `.maestro/app/` flows + artifact upload | Planned |
| Perf regression (Flashlight / Sentry Performance) | Baseline on game screen | Planned |
| PostHog events schema | `src/lib/analytics/` | Planned |
| EAS metadata + Remotion launch videos | `eas metadata` + `remotion/` + GHA | Planned |
| `pnpm check-all` in PR template | Already partial | Done |

---

## Milestone 1 — Playable & trustworthy (MVP+)

**Goal:** Never lose a game; core UX feels intentional; beginners aren’t lost.

| Item | PR | Status |
|------|-----|--------|
| **Game state persistence** (MMKV, resume on launch) | `feat/game-persistence` | 🟡 In progress |
| **Bear-off tappable** | same PR | 🟡 In progress |
| **Roll phase UX** — board doesn’t steal focus; pulsing Roll CTA | `feat/roll-phase-ux` | 🟡 In progress |
| **Move hints toggle** — glow on stacks with legal moves | `feat/move-hints` | 🟡 In progress |
| **Single-movable pulse** — only one stack can move | `feat/move-hints` | 🟡 In progress |
| **Stack join preview** — ghost checker on press-in to legal stack | `feat/stack-preview` | 🟡 In progress |
| **Direction overlay** — horseshoe path (like backgammon.com) | `feat/direction-overlay` | 🟡 In progress |
| **Tips banner** — rotating tips while waiting / rolling | `feat/tips` | 🟡 In progress |
| **Dice: numbers vs dots** setting | `feat/dice-style` | 🟡 In progress |
| **Responsive board** — `useWindowDimensions`, iPad max width | `feat/responsive-board` | 🟡 In progress |
| **Settings** from home + game prefs section | `feat/game-settings` | 🟡 In progress |
| **Game logic unit tests** (`moves.ts`, pip count, bear-off) | `test/game-logic` | 🟡 In progress |
| **Landscape** layout pass + screenshot | Planned | |

---

## Milestone 2 — Learn Backgammon (Duolingo layer)

| Item | Notes |
|------|-------|
| Lesson modules | Board setup, direction, hitting, bearing off, doubling |
| Interactive “Try it” boards | Like [bearing off tutorial](https://backgammon.com/learn/) |
| Quizzes | Multiple choice at end of lessons |
| **Puzzles** | “Find the best move” — local positions |
| Full-screen **movement compass** | Color, home board, START→HOME |
| Animations | Hit → bar, bear-off, game start/end (Fruit Ninja energy) |
| Tips as loading states | Queue from `src/lib/game/tips.ts` |

---

## Milestone 3 — Mastermind (analysis & history)

| Item | Notes |
|------|-------|
| Move history + **save/replay** (local) | JSON in MMKV |
| Post-game **blunder summary** | Compare to AI top move |
| Session **statistics** | Win rate, gammons, cube decisions |
| Advanced stats dashboard | Pip equity trends, doubling mistakes |
| AI chat after game | Optional, local-first |

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

---

## GitHub Projects setup

Create a project board with columns: **Backlog → Ready → In Progress → In Review → Done**.

Suggested labels: `milestone-1` … `milestone-6`, `ux`, `learn`, `ci`, `perf`, `good-first-issue`.

```bash
# Example: create issues from this doc (run locally)
gh issue create --title "M1: Game state persistence" --label milestone-1
```

---

## References

- [Board setup & direction](https://backgammon.com/learn/board-setup-explained)
- [When to double](https://backgammon.com/learn/when-to-double)
- [BackgammonCV](https://github.com/christiancorro/BackgammonCV) — board recognition research
