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
press and drag on a point to increase or decrease its checker stack. Secondary
forms should stay out of the initial editing workspace.

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
