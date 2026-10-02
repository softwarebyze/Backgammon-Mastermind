# Marketing

Current store assets. Git history is the archive; this folder is not copied per release.

## Screenshots

Raw captures, the frame manifest, and composed upload PNGs live here. Capture and compose stay manual, because they need a running production web build. Upload does not: **Upload Store Screenshots** and **Upload App Store Screenshots** stage this folder with `pnpm screenshots:prepare` and send it to the stores. How-to: [store-screenshots.md](../store-screenshots.md).

| Path | What |
|------|------|
| `screenshot-frames.json` | Layout and English headlines |
| `screenshot-localizations.json` | Localized headline copy |
| `app-store-screenshots/raw/` | Undressed captures |
| `app-store-screenshots/*.png` | Composed iPhone 6.9" and iPad 13" shots |

## Videos

`videos/` is replaced on every GitHub Release by [Remotion Render (Release Assets)](../../.github/workflows/remotion-render-release.yml). That job runs `pnpm render:all` and commits every `out/*.mp4`. Add a video by adding a `render:*` script to `remotion/package.json` and including it in `render:all`. The workflow does not list filenames.

```bash
cd remotion && pnpm render:all
cp out/*.mp4 ../docs/marketing/videos/
```
