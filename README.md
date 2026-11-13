# Evidence for PR #387 (`a992747a`)

Playwright WebKit, iPhone 16 Pro viewport (402×681). Production vs the commit-pinned preview of [#387](https://github.com/softwarebyze/Backgammon-Mastermind/pull/387) at `a992747a287c96b476e602722048355a1d7e130f`:

https://backgammon-mastermind-4oirc5lgc-softwarebyzes-projects.vercel.app

Stills live on this `evidence/pr-387` branch (not a GitHub release — releases trigger the EAS / TestFlight workflows).

## Key stills

- `compare-en-zoom-100.png` — at 100% zoom, Home is within 1 px of production (no visual change at normal zoom).
- `compare-en-zoom-115.png` / `compare-en-zoom-125.png` / `compare-en-zoom-150.png` — production clips both edges from 115% up; the preview stays inside the screen.
- `compare-en-levels-115-125-150.png` — difficulty row at 115 / 125 / 150%. "Medium" stays one word (never "Mediu / m"); font shrinks to fit (15 / 13.7 / 12 / 8.7 px).
- `compare-locales-zoom-150-levels.png` — de / es / he / ar difficulty labels at 150%. Words stay intact (`Gegen Computer` wraps at the space; Mittel / Schwer / Experte, Medio / Difícil / Experto, and the Hebrew / Arabic labels are complete).
- `pr387-*-402x681-zoom-*-levels.png` — cropped difficulty rows per locale and zoom.
- `metrics-labels.json` / `metrics-402x681.json` — overflow measurements.

A fix should pass at 402×681 with 100 / 115 / 125 / 150% zoom: nothing past either edge, and no mid-word break in the segmented-control labels (including de / es / he / ar).
