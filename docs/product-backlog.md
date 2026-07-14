# Product tracking

**Source of truth for what to build next:** [GitHub Issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) + the **Backgammon Mastermind** [GitHub Project](./github-project-setup.md) (board).

This file is a **pointer only**. Do not maintain parallel priority tables or checklists here — they go stale (see the old v0.1.3 tables that still claimed DnD / undo were open after they shipped).

| Layer | Role |
|-------|------|
| **GitHub Issues** | Work items, acceptance criteria, discussion, PR links (`Fixes #N`) |
| **GitHub Project** | Priority / Now / Next / Later columns |
| **Release issues** | Ship gate for a version (e.g. [#112](https://github.com/softwarebyze/Backgammon-Mastermind/issues/112) = v0.1.4) |
| **`docs/roadmap.md`** | Long-horizon product map (M0–M6), not the sprint board |
| **`docs/releases.md`** | How to cut TestFlight / store / GitHub releases |
| **`docs/UX-AUDIT.md`** | Frozen 2026-06-27 snapshot — historical only |

## Current release

**Shipped:** [v0.1.3](https://github.com/softwarebyze/Backgammon-Mastermind/releases) (DnD, web restart, post-ship CI/UX fixes).

**Next:** [#112 — Release: v0.1.4](https://github.com/softwarebyze/Backgammon-Mastermind/issues/112)  
Label: `release-0.1.4`

| Gate | Issue |
|------|-------|
| Web options dismiss | [#92](https://github.com/softwarebyze/Backgammon-Mastermind/issues/92) |
| Web board sizing / stacks / header | [#94](https://github.com/softwarebyze/Backgammon-Mastermind/issues/94) |
| Dice default to dots | [#93](https://github.com/softwarebyze/Backgammon-Mastermind/issues/93) |
| Win confetti | [#89](https://github.com/softwarebyze/Backgammon-Mastermind/issues/89) |
| Tasteful game audio | [#75](https://github.com/softwarebyze/Backgammon-Mastermind/issues/75) |

Filter: [`label:release-0.1.4`](https://github.com/softwarebyze/Backgammon-Mastermind/issues?q=is%3Aissue+label%3Arelease-0.1.4)

## How to add work

1. Open or update a **GitHub issue** (acceptance criteria in the issue body).
2. Add it to the Project board column (**Now** / **Next** / **Later**).
3. If it must ship in a version, label it (`release-0.1.4`, …) and link it from that release issue.
4. Do **not** add a second status row in markdown.

## Later (examples — see open issues)

Learn epic (#96), saved boards (#97), share run-through (#98), multi-session (#73), a11y (#77/#86), Sentry/PostHog (#78), visual regression (#87), cancel-selection (#95), board layout (#68), dice→timeline fly (#74).
