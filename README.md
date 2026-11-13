# Evidence for PR #387 (`7a35aa44`)

Playwright WebKit, Safari-like `html { zoom }`. Commit-pinned preview of [#387](https://github.com/softwarebyze/Backgammon-Mastermind/pull/387) at `7a35aa44a8a0470dd4a87eda8d77d4bb743f6202`:

https://backgammon-mastermind-c1k6wxt0j-softwarebyzes-projects.vercel.app

Stills live on this `evidence/pr-387` branch (not a GitHub release — releases trigger the EAS / TestFlight workflows).

This commit fixes the QA FAIL on `a992747`: English "Medium" no longer ellipsizes at 667×375 / 100% zoom, and Russian "Средний" / "Сложный" no longer ellipsize at 150% zoom.

## Key stills (this commit)

- `compare-667x375-medium.png` — iPhone SE landscape 667×375 at 100% zoom: production wraps "Medium" mid-word as `Mediu / m`; `a992747` ellipsizes it as `Medi…`; `7a35aa44` keeps the full word at 14.4 CSS px.
- `compare-402x681-zoom-150-ru.png` — Russian at 150% on 402×681: `a992747` ellipsizes "Сложный"; `7a35aa44` shows the full word (7.3 CSS px / 10.95 on-screen).
- `compare-390x844-zoom-150-ru.png` — Russian at 150% on 390×844: `a992747` ellipsizes "Средний" and "Сложный"; `7a35aa44` shows both complete (7.4 / 6.9 CSS px).
- `compare-en-levels-100-125-150.png` — English difficulty row at 100 / 125 / 150% on 402×681. "Medium" stays one word (15 / 12.5 / 8.9 CSS px).
- `compare-locales-zoom-150-levels-7a35aa44.png` — de / es / he / ar at 150% on 402×681: no mid-word breaks, no ellipsis, RTL intact.
- `metrics-7a35aa44.json` — overflow / font measurements.

At 100% zoom, Home is pixel-identical to production on 402×681, 390×844, and 390×664 (0 pixels changed). 667×375 at 100% is the SE-landscape case that did not fit in production; it is intentionally different (full "Medium" instead of a mid-word wrap).

## Earlier stills (`a992747` and before)

The original zoom-clipping compares (`compare-en-zoom-*.png`, `compare-en-levels-115-125-150.png`, locale crops) remain from the earlier commits: production still clips both edges from 115% up; the preview stays inside the screen.
