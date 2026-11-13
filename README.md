# QA evidence for PR #389 (`ea01515`)

Playwright WebKit, iPhone 16 Pro / iPad Pro 11 profiles. PostHog route-aborted.
Preview: https://backgammon-mastermind-6zpgwncz4-softwarebyzes-projects.vercel.app (tip `ea015150e440f777f1dac85ac94dfe108490f454`).
Production befores use the baseline share links from `share-urls.txt`.

## Key stills

- `compare-iphone-portrait-w7-before-after.png` — Zack's squish complaint: 7 off bunched at the edge vs filling the tray as edge-on discs.
- `compare-iphone-landscape-w15-before-after.png` — production was 10 + `+5`; after, all 15 are visible.
- `compare-iphone-portrait-w0-before-after.png` — empty placeholder moves to the outer edge.
- `contact-after-trays.png` — 0 / 7 / 14 / 15 on iPhone and iPad, portrait and landscape.
- `contact-plan-390x844-1-5-10-15.png` — test-plan counts 1 / 5 / 10 / 15.
- `anim-flight.png` / `anim-after-tray.png` — bear-off animation landing on the new top slab.
- `legal-target-after-select.png` — legal dest marked by the orange dashed hint arrow onto the tray.
- `rtl-he-w7-b7-full.png` — Hebrew RTL, 7/7 stack still fills both halves.
- `learn-bearing-off-board.png` — Learn → Bearing off, 12 off evenly spaced.

Board size and tray width match production at every baseline viewport (see `metrics.json`).
