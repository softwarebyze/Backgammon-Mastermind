# PR #188 production review evidence

Captured on 2026-09-26 with an iPhone 17 Pro simulator. The native app used
the local branch through Metro. Safari used the PR's Vercel preview URL.

## Native hint

- [Hint with a single clear recommendation path](hint-clear-arrows-ios.png). The
  move-direction guide is hidden while the engine's green arrows are shown.
- [Hint playback recording](hint-playback-ios.mp4). The first checker enters,
  then the second move completes and play continues.

## Native Tutor review

- [Unrevealed blunder question and severity meter](blunder-question-ios.png).
- [Revealed comparison and Play best move action](best-move-comparison-ios.png).
- [Blunder-to-best-move recording](blunder-best-move-ios.mp4). This covers
  opening the comparison, rewinding the user's move, and applying the engine
  recommendation before the computer's next turn.

## iOS Safari preview smoke

- [Real WASM hint in Safari](hint-safari-preview.png).
- [Game continuing after Play this move in Safari](after-hint-safari-preview.png).

## Engine source notice

- [About screen with Open-source notices](open-source-notices-ios.png).
- [Pinned Open Sage source and MPL license opened from the app](open-source-source-link-ios.png).

## Checks

- `pnpm check-all`: lint, type checks, translation structure, Jest, knip.
- Native iOS and Android compile checks, Android emulator smoke, Gradle APK,
  Expo Doctor, EAS preview, and Vercel preview run in PR CI.
- Regression tests cover stale async hint/Tutor results after unmount,
  cubeless candidate ranking, and rewind-before-playback sequencing.
