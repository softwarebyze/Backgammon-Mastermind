# Backgammon Mastermind

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

The existing Expo application runs on iOS, Android, and the web.

## Users

The confirmed audience for Positions is anyone who wants to recreate a
backgammon position, see it on a board, try playing from it, or share it with
someone else. No account or developer access is required for this workflow.

The confirmed editing interaction is the board and a White/Black selector:
press location sets the initial stack size, then dragging increases or decreases
its checker stack. The bar uses that same direct interaction for the selected
colour; it does not need a separate selection menu. A blocked addition gives subtle haptic and screen-reader feedback
when the selected colour has no checkers left. Standard setup and Clear board stay above the board. Dice stay visible and
are edited by tapping a die and choosing a face. Selecting a stack reveals
minus / clear / plus immediately beside its board edge, with no sliders button.
Other secondary forms stay out of the initial editing workspace. The user rejected a
wall of equally weighted text buttons. The board remains dominant; tools use
compact icon-led disclosure rows, selected controls use restrained outlines,
and Play is the single filled orange action.

## Product Purpose

Public position setup connects visual board editing, import/export with
popular backgammon programs, local saved positions, and links that recipients
can open before deciding to play. Success means the board and position
context survive that exchange, and opening a position preserves an active
game until the player explicitly chooses to replace it.

## Capabilities and Constraints

[Positions](docs/positions.md) records supported formats, validation, local
bookmark storage, shared-link behavior, translations, and checker-play limits.
XGID and GNU Position/Match IDs describe positions; importing full match files,
replay sharing, and simultaneous active games remain separate work.

This record scopes the confirmed Positions brief. It does not establish a new
audience or strategy for the application's other features.

## Brand Commitments

The user explicitly requested reuse of the existing board, styles, and
translations. The incumbent `BoardView`, `src/features/game/game-palette.ts`,
and shared UI/font components are the visual authority for this extension.
Position work must preserve that identity.

## Evidence on Hand

- `docs/positions.md`: feature behavior and interoperability boundaries.
- `src/lib/positions/`: position validation, codecs, sharing, and local storage.
- `src/features/positions/`: public visual setup and preview.
- `.maestro/app/position-setup.yaml`: Android setup/import/export/share flow.
- `.maestro/app/position-preview-ios.yaml`: iPhone/iPad editor and shared preview.
- PR #323: CI screenshots, recordings, and verification results.

## Product Principles

- Let anyone inspect and share a position without replacing their active game.
- Preserve position context, and explain conversions that cannot preserve it.
- Keep local bookmarks distinct from links that anyone can open.
- Extend the existing board and interaction language.

Standard setup uses its text label without an icon. Positions uses solid question-mark faces
for unset dice (shared with the game), and a visible ivory doubling cube with
ownership and direct value controls. Cube appearance follows PR #325's match
work; the position editor does not introduce a competing match engine.

Match scores are a visible, editable scoreboard with player-coloured scorecards
and a central match target, following the match-play branch's flip-card material.
Tap the numerals to edit. Shortening a match clamps scores to its target; rules
remain secondary. Zero match length continues to mean a money game.

The board workspace has no ambient borne-off summary or gesture instruction
text. It relies on the existing board/trays and contextual joined stack strip.
The strip combines decrement, count/clear, and increment without a separate point
label or X button. Editing an occupied point retains its checker colour until
it is empty; subsequent additions use the selected colour, even within one drag.
