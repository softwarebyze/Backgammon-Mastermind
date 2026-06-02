# Design & UX Audit — Backgammon Mastermind

Last updated: 2026-05-21. Use this as the quality bar before shipping UI changes.

## Tools for visual QA

| Tool | Purpose | Setup |
|------|---------|--------|
| **Android emulator + Metro** | `pnpm android` | Daily dev |
| **Maestro** | `pnpm e2e-smoke` | CI + local |
| **agent-device** | `pnpm device:snapshot` | Needs dev build + a11y labels |
| **Argent** (`.agents/skills/argent-*`) | Screenshot-verify loops | MCP in Cursor when configured |
| **Figma** | Not wired in repo | Optional: export board/sheet specs |

No Figma file is required for code review — run the app after every UI PR.

---

## Screen-by-screen status

### Home
| Check | Status |
|-------|--------|
| Readable typography on `#1E0C02` | ✅ |
| Settings gear visible | ✅ |
| Resume game when saved state exists | ✅ |
| Copy not overwhelming | ✅ |

### Game
| Check | Status |
|-------|--------|
| Board: flat points, no wash-out gradient | ✅ Fixed (flat triangles + flat wood) |
| White checkers contrast on light points | ✅ Shadow + warmer gold points |
| Controls dock fixed height (no jump) | ✅ |
| No pulsing / overlay / tip banner | ✅ |
| In-game options (sliders icon) | ✅ |
| Move hints optional, subtle ring only | ✅ Default off |

### Game options sheet
| Check | Status |
|-------|--------|
| Title readable (`headerTheme="game"`) | ✅ Fixed |
| Toggles with icons | ✅ |
| Dice: radio cards with 5\|5 preview | ✅ Fixed |
| Direction: horseshoe icon | ✅ Fixed |

### Settings (full)
| Check | Status |
|-------|--------|
| High contrast on dark brown | ✅ `GAME_PALETTE` |
| Game section matches quick sheet | ✅ Shared components |

---

## Code standards (UI)

- **Colors:** Use `GAME_PALETTE` / `BOARD_THEME` — no raw Tailwind `neutral-*` on game/settings screens.
- **Sheets:** Pass `headerTheme="game"` on game modals.
- **Settings controls:** Reuse `src/features/game/components/settings-ui/*`.
- **Board:** No vertical gradients on points or wood base.
- **Motion:** No infinite loops on gameplay UI; tap feedback only.

---

## Remaining gaps (roadmap)

- [ ] Landscape / iPad layout pass + screenshot CI
- [ ] Haptic tap on legal move (light, once)
- [ ] Learn mode tips (separate from gameplay — not the old banner)
- [ ] Post-game analysis UI
- [ ] Lottie or short animation on win (single play, not loop)

---

## PR checklist (UI)

1. Screenshot game + sheet + settings on device/emulator
2. `pnpm check-all`
3. Maestro smoke if copy or a11y labels changed
4. No new `neutral-*` text on dark screens without verifying contrast
