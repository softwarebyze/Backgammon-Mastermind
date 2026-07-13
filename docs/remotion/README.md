# Remotion marketing videos

## Keeping `main` up to date

On every **GitHub Release**, [`.github/workflows/remotion-render-release.yml`](../../.github/workflows/remotion-render-release.yml) re-renders all compositions and commits:

- [`after/`](./after/) — latest polished outputs
- [`docs/marketing/v{version}/`](../marketing/) — versioned copies + README

Manual dispatch: Actions → **Remotion Render (Release Assets)**.

Local:

```bash
cd remotion && pnpm install && pnpm render:all
cp out/*.mp4 ../docs/remotion/after/
```

## Before / after (PR #polish)

Pre-polish renders (wrong board layout, sizing issues) are in [`before/`](./before/).

Polished renders are in [`after/`](./after/) (also written to `remotion/out/` when you run `pnpm render:all`).

**v0.1.1 spotlight** highlights: resume, checker animations, compound moves, dice shuffle — see `remotion/src/compositions/feature-spotlight.tsx`.

## Compositions

| ID | Output | Format |
|----|--------|--------|
| `LaunchHero` | `launch-hero.mp4` | 1080×1920 |
| `AppStorePreview` | `app-store-preview.mp4` | 1920×1080 |
| `FeatureSpotlight` | `feature-spotlight.mp4` | 1080×1080 |
