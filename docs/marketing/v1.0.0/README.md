# v1.0.0 — first App Store production

## Screenshots

Source: `app-store-screenshots/` — captured from **production** Expo web (`EXPO_PUBLIC_APP_ENV=production`) at Apple’s pixel sizes. No Preview badge, no `0.1.3`, no browser chrome, no Maestro watermark.

Recapture (Mac iOS simulators are not required):

```sh
EXPO_PUBLIC_APP_ENV=production BROWSER=none CI=1 pnpm exec expo start --web --port 8082
STORE_SHOT_BASE=http://127.0.0.1:8082 pnpm screenshots:capture
```

Do **not** Fastlane-upload until this set is approved. Do not merge from this recapture alone.

### Pixel sizes (`file`)

Verified 2026-08-28:

| File | Pixels |
|------|--------|
| `iphone-69-01-home.png` | 1320×2868 |
| `iphone-69-02-learn-hub.png` | 1320×2868 |
| `iphone-69-03-lesson-hitting.png` | 1320×2868 |
| `iphone-69-04-vs-computer.png` | 1320×2868 |
| `iphone-69-05-legal-highlights.png` | 1320×2868 |
| `ipad-13-01-home.png` | 2064×2752 |
| `ipad-13-02-learn-hub.png` | 2064×2752 |
| `ipad-13-03-lesson-hitting.png` | 2064×2752 |
| `ipad-13-04-vs-computer.png` | 2064×2752 |
| `ipad-13-05-legal-highlights.png` | 2064×2752 |

iPhone 6.9" is 440×956 CSS at deviceScaleFactor 3 (physical 1320×2868). iPad Pro 13" slot is 1032×1376 CSS at deviceScaleFactor 2 (physical 2064×2752). If `identify` is installed: `identify docs/marketing/v1.0.0/app-store-screenshots/*.png`.

### Scenes (same five on both devices)

1. **Home** — logo, **Backgammon Mastermind** lockup, Learn / vs Computer / 2 Players (no Resume, no Preview).
2. **Learn hub** — full lesson list.
3. **Hitting & the bar** — one live-board lesson (not bearing-off; not a second lesson duplicate).
4. **vs Computer gameplay** — full board + dice, opening “Who goes first?” dismissed.
5. **Legal-move highlights** — checker selected, destination points lit. Not Settings.

Upload later: `pnpm screenshots:upload:ios` (Fastlane — [store-screenshots.md](../../store-screenshots.md)). Do not wait for a human in ASC.

## Pricing

Paid Up Front **$4.99** USD, available in all territories (Apple equivalent tiers).

## Privacy nutrition labels (PostHog)

Declare **Product Interaction** / **Analytics** data collected, not linked to identity, not used for tracking (ATT). Privacy policy URL is in `store.config.json` — push with `pnpm metadata:push:production` ([eas-metadata.md](../../eas-metadata.md)). Nutrition labels themselves are ASC UI-only.

## ASC app record

Production bundle: `com.backgammonmastermind`. If name conflicts with the development ASC app, rename the development listing to "Backgammon Mastermind (Dev)" first.
