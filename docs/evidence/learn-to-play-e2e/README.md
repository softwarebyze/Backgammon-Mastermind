# Learn to Play — e2e evidence (PR #123)

Captured on iPhone 17 Pro simulator (`com.backgammonmastermind.development`) with:

- **agent-device** — accessibility-driven taps/snapshots
- **Argent** — launch/describe/gesture + screen recording

## Flow covered

1. Home (Learn CTA shows progress)
2. Learn hub (4/5 lessons)
3. Bearing-off lesson + Hint
4. Settings → Support Us + Links (Privacy, Terms, GitHub, Website)

## Watch

- [`learn-e2e.mp4`](./learn-e2e.mp4) — live simulator recording (agent-device + Argent reboot), compressed
- [`learn-e2e-slideshow.mp4`](./learn-e2e-slideshow.mp4) — key frames if you want a quick skim
- PNGs `04`–`10` — home, hub, lesson, settings links

Settings link targets (code): `src/lib/app-links.ts` → GitHub privacy/terms + support mailto.
