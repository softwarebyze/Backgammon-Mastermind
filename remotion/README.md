# Backgammon Mastermind — Marketing Videos

Remotion project for launch and social marketing assets.

## Compositions

| ID | Format | Duration | Use case |
|----|--------|----------|----------|
| `LaunchHero` | 1080×1920 (9:16) | ~16s | TikTok, Reels, Stories |
| `AppStorePreview` | 1920×1080 (16:9) | ~20s | YouTube, website hero |
| `FeatureSpotlight` | 1080×1080 (1:1) | ~13s | Instagram feed, ads |

## Quick start

```bash
cd remotion
pnpm install
pnpm dev          # Remotion Studio preview
pnpm render:all   # Render all videos to out/
```

## Assets

Brand assets are copied from `../assets/brand/` into `public/`:
- `display-logo.png` — app logo
- `icon-source.png` — icon source

Re-run after branding changes:

```bash
cp ../assets/brand/display-logo.png ../assets/brand/icon-source.png public/
```

## From repo root

```bash
pnpm remotion:dev
pnpm remotion:render
```
