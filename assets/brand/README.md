# App branding (Expo-compliant)

Official guide: [Expo — Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)

Design template: [Figma splash + icon template](https://www.figma.com/community/file/1637141012732584189)

## Files

| File | Role | Expo requirement |
| ---- | ---- | ---------------- |
| `icon-source.png` | **Your master** (drop in a 1024×1024 PNG) | Starting point only |
| `brand.config.json` | Colors + scale tuning | Read by `app.config.ts` + generator |
| `icon.png` | Home screen / App Store icon | Opaque, fills 1024×1024 square |
| `splash-icon.png` | Splash **logo layer** | **Transparent** PNG — background comes from `splashBackgroundColor` |
| `adaptive-foreground.png` | Android adaptive icon layer | Transparent PNG, content in center safe zone |
| `favicon.png` | Web | Generated 48×48 |

**Do not** point splash at `icon-source.png` or a photo on a white rectangle — you get a white box on a dark splash.

## Workflow

```bash
# 1. Replace master artwork
# 2. Tune colors/scales in brand.config.json if needed
pnpm brand:generate

# 3. Rebuild native app (icon/splash are baked in)
pnpm build:development:android:local
pnpm build:development:ios:local
```

`app.config.ts` references the **generated** files (`icon.png`, `splash-icon.png`, etc.).

## Testing splash (easy to get wrong)

| Build type | What you see on launch |
| ---------- | ------------------------ |
| **Dev client** (`expo-dev-client`) | Expo dev launcher splash — **not** your branded splash |
| **Preview / production** native build | Your `expo-splash-screen` config |

To verify branding: `pnpm build:preview:android:local` (or iOS) — not Expo Go, not dev client alone.

## Tuning

Edit `brand.config.json`:

- `iconScale` / `splashScale` / `adaptiveScale` — how large the trimmed board appears (0–1)
- `splashImageWidth` — logical width in `expo-splash-screen` plugin (default 280)
- `splashBackgroundColor` — should match app theme (`#1E0C02`)

After changing `icon-source.png` or scales, run `pnpm brand:generate` again.
