# v1.0.0 — first App Store production

## Screenshots

`app-store-screenshots/` — 1320×2868 (iPhone 6.9"):

1. Settings links
2. vs Computer

Learn-based captures were removed with the Learn to Play feature (issue below). Re-capture a fresh set (home, vs Computer, 2-player, settings) before the next screenshot upload.

Upload: `pnpm screenshots:upload:ios` (Fastlane — [store-screenshots.md](../../store-screenshots.md)). Do not wait for a human in ASC.

## Pricing

Paid Up Front **$4.99** USD, available in all territories (Apple equivalent tiers).

## Privacy nutrition labels (PostHog)

Declare **Product Interaction** / **Analytics** data collected, not linked to identity, not used for tracking (ATT). Privacy policy URL is in ``store.config.js` + `store/locales/` — push with `pnpm metadata:push:production` ([eas-metadata.md](../../eas-metadata.md)). Nutrition labels themselves are ASC UI-only.

## ASC app record

Production bundle: `com.backgammonmastermind`. If name conflicts with the development ASC app, rename the development listing to "Backgammon Mastermind (Dev)" first.
