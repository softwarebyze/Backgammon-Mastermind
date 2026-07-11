# Product backlog — single source of truth

**This file is the product source of truth.** GitHub issues track work; this doc decides priority and status.  
Other docs (`roadmap.md`, `issue-board.md`, `UX-AUDIT.md`) should point here and stay thin.

Last reconciled: **2026-07-11** (feedback 7/9–7/11 + open issues + shipped `main` @ v0.1.2).

---

## How to use

| Layer | Role |
|-------|------|
| **This doc** | Priority, ship gate, status, “why” |
| **GitHub issues** | Acceptance criteria, discussion, PR links |
| **`docs/roadmap.md`** | Long-horizon milestones (M0–M6) |
| **`docs/releases.md`** | How to cut a store/TestFlight build |

When feedback lands in chat/notes: add a row here first, then open/update a GitHub issue. Do not leave desires only in chat or stale MD checklists.

---

## Next release — v0.1.3 “share-ready”

**Gate:** Do not share publicly until drag-and-drop ships and critical web bugs are fixed.

| Priority | Item | Issue | Status |
|----------|------|-------|--------|
| 🔴 Epic | v0.1.3 share-ready | [#90](https://github.com/softwarebyze/Backgammon-Mastermind/issues/90) | Open |
| 🔴 Blocker | Drag-and-drop checkers (alongside tap-to-move) | [#67](https://github.com/softwarebyze/Backgammon-Mastermind/issues/67) | Open |
| 🔴 Blocker | Web: Restart / New Game does nothing (`Alert.alert` no-op) | [#91](https://github.com/softwarebyze/Backgammon-Mastermind/issues/91) | Open |
| 🔴 Blocker | Web: in-game options sheet has no dismiss (stuck) | [#92](https://github.com/softwarebyze/Backgammon-Mastermind/issues/92) | Open |
| 🔴 Blocker | Dice default to **dots** (not numbers) | [#93](https://github.com/softwarebyze/Backgammon-Mastermind/issues/93) | Open |
| 🟠 High | Web: board sizing, overflow stacks, header hit targets | [#94](https://github.com/softwarebyze/Backgammon-Mastermind/issues/94) | Open |
| 🟠 High | Clearer cancel-selection (re-tap selected / obvious dismiss) | [#95](https://github.com/softwarebyze/Backgammon-Mastermind/issues/95) | Open |
| ⚪ Process | PR QA + CodeRabbit on every PR | [#83](https://github.com/softwarebyze/Backgammon-Mastermind/issues/83) | Ongoing |

**Explicitly not required for first share:** audio, multi-game sessions, puzzles, tutorial epic, a11y full pass, more languages, saved boards, share replay.

---

## Shipped / closeable (verify then close)

| Item | Issue | Proof on `main` | Action |
|------|-------|-----------------|--------|
| Point numbers toggle | #84 | `showPointNumbers` + `PointNumberRail` + prefs panel | **Close** |
| Settings icons / section copy | #71 | `settings-ui/*` icons + Board/Dice/Automation sections | **Close** |
| Compound capture / stuck dice | #64 | `compound-regression.test.ts` + #61 | **Close** |
| Leave/resume flush + stuck anim | #65 | `use-leave-game` flush save + animation watchdogs + #61 | **Close** |
| Home nav stack duplicates | #70 | `router.replace` on home/leave + #61 | **Close** |
| Web white checker box shadow | #72 | `Platform.OS !== 'web'` skip RN shadow in `checker-token` | **Close** |
| Move history v2 on main UI | #69 | `MoveReviewBar` on game screen (#88) | **Close** |
| Replay scrubber (v1) | #46 | ◀/▶ + timeline + path overlay (#88) | **Close** (polish → backlog) |
| Undo/redo | #44 | Closed 2026-07-10; header undo/redo | Done |
| Auto-roll / auto-move | #47/#48 | Closed; prefs | Done |
| Intentional home exit | #49 | Closed | Done |
| Epic review & automation | #50 | Children done except polish | **Close** |
| v0.1.2 TestFlight | #63 | Closed; version `0.1.2` | Done |

---

## Feedback inbox (7/9–7/11) — mapped

### Learning & teaching

| Desire | Milestone | Issue | Notes |
|--------|-----------|-------|-------|
| Beginner tutorial / how to play — best learning app, still expert-friendly | M2 | [#96](https://github.com/softwarebyze/Backgammon-Mastermind/issues/96) / #76 | Learn epic |
| Opening hints + openings explore/quiz | M2 | #96 | |
| Puzzles | M2 | #96 | |
| Yonah: given a roll, guess optimal move → right/wrong feedback | M2 | #96 | Puzzle mode variant |
| Idle → fade-in suggested moves; lightbulb hint | M1 polish | #96 | After DnD stable |
| Integrate opening-move hints in play | M2 | #96 | |

### Core play / UX

| Desire | Milestone | Issue | Notes |
|--------|-----------|-------|-------|
| Drag-and-drop | v0.1.3 | #67 | **Blocker** |
| Simultaneous 1p + 2p games | M4 | #73 | Multi-session architecture |
| Cancel selection less weird | v0.1.3 | #95 | Re-tap / board tap already partial |
| Settings: whole row toggles switch | polish | — | Skip if janky (YAGNI) |
| Sound effects | polish | #75 | Defer until core solid |
| Saved boards (bookmark positions) | M3 | [#97](https://github.com/softwarebyze/Backgammon-Mastermind/issues/97) | |
| Share game run-through | M4 | [#98](https://github.com/softwarebyze/Backgammon-Mastermind/issues/98) | |
| Game history (beyond current timeline) | M3 | #46/#69 closed (v1) | Past-games archive later |
| More languages | M4 | — | i18n infra exists; content TBD |

### Web / platforms (7/10–7/11)

| Desire | Priority | Notes |
|--------|----------|-------|
| Dice default dots | 🔴 #93 | Pref default was `numbers` |
| In-game settings stuck on web | 🔴 #92 | `formSheet` + `headerShown: false` |
| Web padding / spacing / board fit / stacks / header | 🟠 #94 | `useBoardDimensions` width-only |
| Restart broken on Safari/Chrome | 🔴 #91 | `Alert.alert` |

### Quality / process

| Desire | Issue | Notes |
|--------|-------|-------|
| Maestro covers *everything* | — | Today: one smoke flow only — expand after share blockers |
| Full VoiceOver a11y pass | #77 | Post-share or parallel |
| Check iOS / Android / web | process | Every PR that touches UI |
| Confetti on win | #89 | Polish |

---

## Later (do not block share)

Visual regression (#87), reduced-motion (#86), Expo UI explore (#82), custom themes (#81), EAS Insights (#80), in-app feedback (#79), Sentry+PostHog (#78) before *wide* public download, audio (#75), dice→timeline fly (#74), board layout polish (#68), confetti (#89).

---

## Status legend

- 🔴 Ship / share blocker  
- 🟠 High for next release after blockers  
- 🟡 Medium / milestone backlog  
- 🟢 Polish  
- ⚪ Process  
