# v1.0.0 — first App Store production

## Screenshots

Raw captures: `app-store-screenshots/raw/` from **production** Expo web (`EXPO_PUBLIC_APP_ENV=production`) at Apple’s pixel sizes. No Preview badge, no `0.1.3`, no browser chrome, no Maestro watermark. Headlines live in `screenshot-frames.json`. Composed (upload) PNGs: `app-store-screenshots/*.png`.

Recapture (Mac iOS simulators are not required):

```sh
EXPO_PUBLIC_APP_ENV=production BROWSER=none CI=1 pnpm exec expo start --web --port 8082
STORE_SHOT_BASE=http://127.0.0.1:8082 pnpm screenshots:capture
```

After capture, run screenshots compose so Fastlane/ASC get the dressed frames. Do **not** Fastlane-upload until the composed set is approved. Do not merge from this recapture alone.

### Pixel sizes (`file`)

Verified 2026-08-28:

| File | Pixels |
|------|--------|
| `iphone-69-01-vs-computer.png` | 1320×2868 |
| `iphone-69-02-legal-highlights.png` | 1320×2868 |
| `iphone-69-03-lesson-hitting.png` | 1320×2868 |
| `iphone-69-04-learn-hub.png` | 1320×2868 |
| `iphone-69-05-home.png` | 1320×2868 |
| `ipad-13-01-vs-computer.png` | 2064×2752 |
| `ipad-13-02-legal-highlights.png` | 2064×2752 |
| `ipad-13-03-lesson-hitting.png` | 2064×2752 |
| `ipad-13-04-learn-hub.png` | 2064×2752 |
| `ipad-13-05-home.png` | 2064×2752 |

iPhone 6.9" is 440×956 CSS at deviceScaleFactor 3 (physical 1320×2868). iPad Pro 13" slot is 1032×1376 CSS at deviceScaleFactor 2 (physical 2064×2752). If `identify` is installed: `identify docs/marketing/v1.0.0/app-store-screenshots/*.png`.

### Carousel (same five on both devices, composed order)

1. **vs Computer** — headline “Play a real game”. Full board + dice, opening overlay dismissed.
2. **Legal-move highlights** — headline “See every legal move”. Checker selected, destinations lit.
3. **Hitting & the bar** — headline “Learn by playing”. One live-board lesson.
4. **Learn hub** — headline “Five short lessons”. Full lesson list.
5. **Home** — headline “Master the board”. Logo lockup, Learn / vs Computer / 2 Players (no Resume, no Preview).

Raw scene files keep their capture names under `raw/` (01-home … 05-legal-highlights). Compose remaps and reorders via the JSON manifest.

Upload later: `pnpm screenshots:upload:ios` (Fastlane — [store-screenshots.md](../../store-screenshots.md)). Do not wait for a human in ASC.

## Pricing

Paid Up Front **$4.99** USD, available in all territories (Apple equivalent tiers).

## Privacy nutrition labels (PostHog)

Declare **Product Interaction** / **Analytics** data collected, not linked to identity, not used for tracking (ATT). Privacy policy URL is in `store.config.json` — push with `pnpm metadata:push:production` ([eas-metadata.md](../../eas-metadata.md)). Nutrition labels themselves are ASC UI-only.

## ASC app record

Production bundle: `com.backgammonmastermind`. If name conflicts with the development ASC app, rename the development listing to "Backgammon Mastermind (Dev)" first.
