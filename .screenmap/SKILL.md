---
name: screenmap-project
description: Project-specific guidance for the screenmap agent when it explores Backgammon Mastermind.
---

# How to explore this app

No login. Offline client-side Expo app (expo-router under `src/app/`).

## Real params

- `/learn/[lesson-id]` → `goal-board` (first curriculum lesson in `src/lib/learn/curriculum.ts`). Other valid ids: `direction-setup`, `moving-dice`, `hitting-bar`, `bearing-off`. Unknown ids redirect to `/learn`.

## Fine to capture

- Home (`/`), Settings (`/settings`), Language picker (`/language`), Learn hub (`/learn`), Learn graduation (`/learn/graduation`).
- Settings preference toggles (move hints, sound, dice style) only persist locally.

## Leave alone

- Learn lesson **interactive board** (identify / try-move steps). Deep-link the lesson for a screenshot, then leave the checkers and dice alone — mis-taps stall the lesson.
- Do **not** start a full game for baseline. Skip Home **vs Computer** and **2 Players**. `/game` is a long match.
- Do **not** use Settings → Developer (position loader). It starts a game from a preset/JSON and lands on `/game`. Visible on development builds.
- Do not tap Share, Rate, Support, Privacy, Terms, GitHub, or Website — those open the share sheet or Safari.

## Timing

- Home and Settings settle quickly (~2s).
- Learn hub and lesson screens need a moment for the board to layout (~3–4s).

## Notes vocabulary

- Describe what a player would see (home CTAs, settings rows, lesson coach copy), not file-level refactors.
