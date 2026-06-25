# v0.1.1 marketing assets

Screenshots and recordings for TestFlight notes, App Store, and social.

## What's new (copy-paste)

- **Resume saved games** — auto-save + resume on launch
- **Checker slide animations** — moves, captures, bear-off
- **Compound moves** — one tap uses both dice when legal
- **Dice roll shuffle** — animated dice when you roll
- **Opening roll fix** — correct first player, no opening doubles
- **UX polish** — clearer turn copy, slower AI pacing, move hints

## Asset index

| File | Source | Use |
|------|--------|-----|
| `web-home.png` | Expo web | Store / social |
| `web-dice-roll.png` | Expo web mid-roll | Feature highlight |
| `web-moving.png` | Expo web in-game | Gameplay |
| `ios-dice-roll.mp4` | agent-device iOS sim | Social / TestFlight preview |
| `../remotion/after/launch-hero.mp4` | Remotion | Hero / landing |
| `../remotion/after/feature-spotlight.mp4` | Remotion | Instagram square |
| `../remotion/after/app-store-preview.mp4` | Remotion | ASC preview video |

## Regenerate

```bash
# Remotion (from repo root)
cd remotion && pnpm install && pnpm render:all
cp out/*.mp4 ../docs/remotion/after/
cp out/*.mp4 ../docs/marketing/v0.1.1/

# Web screenshots — start Metro, open http://localhost:8081
pnpm web

# iOS recording — dev client + simulator
agent-device boot --platform ios --device "iPhone 17 Pro"
agent-device --platform ios --device "iPhone 17 Pro" record start docs/marketing/v0.1.1/ios-dice-roll.mp4
# … play through opening roll …
agent-device --platform ios --device "iPhone 17 Pro" record stop
```

See [releases.md](../releases.md) for the full TestFlight ship checklist.
