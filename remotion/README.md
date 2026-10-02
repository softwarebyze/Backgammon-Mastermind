# Backgammon Mastermind — Marketing Videos

Remotion project for launch and social marketing assets.

## Compositions

| ID | Format | Duration | Use case |
|----|--------|----------|----------|
| `LaunchHero` | 1080×1920 (9:16) | ~16s | TikTok, Reels, Stories |
| `AppStorePreview` | 1920×1080 (16:9) | ~20s | YouTube, website hero |
| `FeatureSpotlight` | 1080×1080 (1:1) | ~13s | Instagram feed, ads |
| `TutorSpotlight` | 1080×1920 (9:16) | ~9s | Lessons, tutor, and strategy |

## Quick start

```bash
cd remotion
pnpm install
pnpm dev          # Remotion Studio preview
pnpm render:all   # writes out/*.mp4; CI sets REMOTION_GL=swangle
cp out/*.mp4 ../docs/marketing/videos/
```

## Board & layout

The marketing board mirrors the app (`board-view`, `board-theme`, starting position). Sizing uses `fitBoardWidth()` so each composition scales the board to the frame.

## Assets

Brand assets are copied from `../assets/brand/` into `public/`:
- `display-logo.png` — app logo
- `icon-source.png` — icon source

Re-run after branding changes:

```bash
cp ../assets/brand/display-logo.png ../assets/brand/icon-source.png public/
```

## From the remotion directory

```bash
pnpm dev
pnpm render:all
```
