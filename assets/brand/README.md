# App branding (Expo-compliant)

Official guide: [Expo — Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)

Design template: [Figma splash + icon template](https://www.figma.com/community/file/1637141012732584189)

## Files

| File | Role | Expo requirement |
| ---- | ---- | ---------------- |
| `icon-source.png` | **Master board image** (generated) | Standard [2-5-3-5 setup](https://backgammon.com/learn/board-setup-explained) — same as in-game |
| `brand.config.json` | Colors + scale tuning | Read by `app.config.ts` + generator |
| `icon.png` | Home screen / App Store icon | Opaque, fills 1024×1024 square |
| `splash-icon.png` | Splash **logo layer** | **Transparent** PNG — background comes from `splashBackgroundColor` |
| `adaptive-foreground.png` | Android adaptive icon layer | Transparent PNG, content in center safe zone |
| `display-logo.png` | In-app home screen | Trimmed board, natural aspect — use with `resizeMode="contain"` |
| `favicon.png` | Web | Generated 48×48 |

**Do not** point splash at `icon-source.png` or a photo on a white rectangle — you get a white box on a dark splash.

## Workflow

```bash
# 1. Regenerate board art (2-5-3-5) + Expo icon/splash assets
pnpm brand:generate

# Optional: only regenerate icon-source.png
pnpm brand:icon-source

# 2. Tune colors/scales in brand.config.json if needed, then re-run brand:generate

# 3. Rebuild native app (icon/splash are baked in)
pnpm build:development:android:local
pnpm build:development:ios:local
```

## Why not vanilla Obytes?

Obytes ships four PNGs you replace by hand. Expo actually requires **different** assets for launcher vs splash (splash must be transparent). `brand:generate` only handles that native split — it does not affect your React UI except `display-logo.png` for the home header.

**Minimum workflow:** `pnpm brand:generate` → rebuild dev client for store icon/splash.

`icon-source.png` is **generated** from the same starting position as the game engine (`createInitialPoints`). To use custom photography instead, replace `icon-source.png` manually — `brand:generate` will crop white padding and drop shadows if present.

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
