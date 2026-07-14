# UX & Product Audit (2026-06-27)

**Frozen historical snapshot from 2026-06-27.** Do not update status rows or checklists in this file — they are intentionally stale.

**Live priorities:** [GitHub Issues](https://github.com/softwarebyze/Backgammon-Mastermind/issues) + Project board ([setup](./github-project-setup.md)). Current release: [#112 v0.1.4](https://github.com/softwarebyze/Backgammon-Mastermind/issues/112).

~~The conversation backlog checkbox “Undo/redo PR #62 — defer post v0.1.2” below is obsolete — undo/redo shipped (#44 / #88).~~

Legend (historical): 🔴 ship-blocker · 🟠 high · 🟡 medium · 🟢 polish · ⚪ process

---

## Gameplay & board

| | Issue | Problem | Status |
|---|-------|---------|--------|
| 🔴 | #46 / review | Move scrubber: board didn't rewind (missing replay baseline) | **Fix in branch** — derive baseline from log |
| 🔴 | #46 | Review: no visible move path / animation | **Fix in branch** — arrow overlay + checker slide |
| 🟠 | #66 | Dice roll: harsh number flashing, not tumbling | **Partial fix** — slower roll, fewer frame swaps |
| 🟠 | — | AI moves too fast (vs-computer) | **Fix in branch** — 750ms pause before move |
| 🟠 | #64/#65 | Compound moves / leave-resume | Needs device QA (#63) |
| 🟡 | #68 | Bar groove, dice placement on board | Open |
| 🟡 | #67 | Drag-and-drop checkers | Open (defer?) |
| 🟡 | #84 | Board point numbers toggle | Open |

---

## Move history & progressive disclosure

| | Issue | Problem | Recommendation |
|---|-------|---------|----------------|
| 🟠 | #69/#46 | History should not clutter main screen | Scrubber only when `moveLog.length > 0`; hide until first move |
| 🟠 | — | Website-style big arrow + glide | Port pattern from [openings site](https://github.com/softwarebyze/backgammon-openings-website) `move-animation.tsx` |
| 🟡 | — | Progressive disclosure | Default **Live**; review is opt-in via ◀/▶; no duplicate move list in options ✅ |

Reference: website uses dashed SVG paths, checker glide, destination pulse — mobile now has path overlay; pulse + reverse scrub TBD.

---

## Settings & copy

| | Issue | Problem | Status |
|---|-------|---------|--------|
| 🟠 | #71 | Settings icon / hint copy drift | **Fixed** — section groups, hint text, active icons |
| 🟡 | — | Move hints: blue glow vs “normal board” | Overlay tint (toggle off = clean board) ✅ |
| 🟡 | #84 | Board section ready for point numbers | Sections added ✅ |

---

## Navigation & shell

| | Issue | Problem | Status |
|---|-------|---------|--------|
| 🟢 | #49 | Exit alert annoying | Silent save-and-exit ✅ |
| 🟡 | #70 | Nav stack duplicate on swipe back | Open — verify `router.replace` |
| 🟢 | — | Home screen unnecessary scroll | Fixed layout ✅ |
| 🟢 | — | About duplicate app name | Version only ✅ |

---

## Design system & modern practice

| | Topic | Notes |
|---|-------|-------|
| 🟠 | **Progressive disclosure** | Game options = quick toggles; Settings = full prefs + hints; review = hidden until moves exist |
| 🟠 | **Motion** | Respect `prefers-reduced-motion` (website does; mobile TBD #86) |
| 🟡 | **Visual hierarchy** | Turn banner + pip bar + board + single control strip — avoid a fourth history band mid-screen |
| 🟡 | **Telegram-bar polish** | Core loop stable before audio (#75), multi-game (#73) |

---

## Free / OSS tools for AI-built app quality

| Tool | Cost | Fit for this repo |
|------|------|-------------------|
| [react-native-preflight](https://github.com/RamboWasReal/react-native-preflight) | Free OSS | Maestro flows + **visual regression** snapshots; strips from prod |
| [react-native-screenshot-test](https://github.com/Abhinandan-Kushwaha/react-native-screenshot-test) | Free OSS | Pixel diff via web/headless; good for board components |
| [Playwright](https://playwright.dev) | Free OSS | **Web** visual regression on Vercel deploy (#87) |
| [Sherlo](https://github.com/sherlo-io/sherlo) | Freemium cloud | Native Storybook VRT — if we add RN Storybook |
| **React Doctor** | Already in CI | Lint/architecture — keep |
| **Maestro** | Cloud key optional | Smoke on Android CI — extend with screenshot asserts |

**Recommendation:** #87 Playwright visual baselines for **web** (Vercel) + preflight/Maestro screenshots for **native** — matches your “screenshots business” instinct without paid Percy.

---

## Release & infra

| | Issue | Notes |
|---|-------|-------|
| 🔴 | #63 | v0.1.2 TestFlight after device QA |
| 🟡 | — | Web on **Vercel** until EAS web quota resets July 1 — document in playbook |
| ⚪ | #83 | PR QA gate + CodeRabbit |
| ⚪ | — | GitHub Projects — see [`github-project-setup.md`](./github-project-setup.md) (Issues + Project are SOT) |

---

## Obytes template & playbook

See `docs/obytes-template-playbook.md` § fork delta (updated 2026-06-27):

**Upstream-worthy from this fork:** branding script, game-prefs MMKV pattern, silent leave + persistence, replay engine in pure TS, CI react-doctor, Vercel web fallback doc.

**Scrub project note:** dev vs preview bundle IDs — same fix as Obytes `env.ts` multi-scheme pattern; document for second app.

---

## Conversation backlog (historical — 2026-06-27)

Do not treat unchecked boxes as open work. Status as of the docs cleanup (2026-07-13):

- [x] Move history v2 not in options sheet
- [x] Settings sections Board / Dice / Automation
- [x] Undo/redo — shipped (#44 / #88); old “defer PR #62” note was stale
- [x] Timeline / scrubber v1 — shipped (#46 / #69 / #88)
- [x] Device verify #64–#65, #70, #72 — closed on `main`
- [ ] Sentry/PostHog #78 before wide public — still open (not v0.1.4)
