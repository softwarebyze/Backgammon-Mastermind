# bgmm-qa evidence: PR #394 @ 8d9c951 (fixes #353)

Production/main = c2d9619 (https://backgammon-mastermind.vercel.app).
Preview = https://backgammon-mastermind-lpps2bs7p-softwarebyzes-projects.vercel.app (Vercel deployment for 8d9c951).
Playwright, fresh context each run, cache disabled (Chromium CDP). PostHog: only the GET config was allowed; every POST to us.i.posthog.com (/batch/) was aborted.

## 1. Console (`pageerror`)
| flow | main | preview |
|---|---|---|
| (a) vs Computer → Start game (Chromium; computer moved first) | `Requiring unknown module "2952"` | clean |
| (b) vs Computer → Start → Hint (Chromium / WebKit iPhone 15 Pro) | error / error | clean / clean |
| (c) 2 Players → Start → Hint, Hint is the first engine use (Chromium / WebKit) | error / error | clean / clean |
| /position route, 10 parity positions (Chromium) | 10/10 error | 0/10 |

WebKit flow (a): human won the opening roll, so the engine was not used within 20 s on either build (no error, no fetch); covered by (b)/(c).

Logs: `console-<build>-<flow>-<browser>.log`. Still: `console-main-vs-pr.png`, `hint-main-vs-pr.png`.

## 2. Lazy loading (Chromium flow c, transferred bytes)
| asset | main | preview | fetched |
|---|---|---|---|
| entry-*.js | 1,662,404 B | 1,661,722 B | Home load |
| web-engine-*.js chunk | 1,136 B | — (gone) | first engine use (main only) |
| /bgsage/bgsage.js | 38 KB | 38 KB | first engine use |
| /bgsage/bgsage.wasm | 163 KB | 163 KB | first engine use |
| /bgsage/bgsage.data (weights) | 8.57 MB | 8.57 MB | first engine use (~0.5–0.8 s) |

No /bgsage/* request on either build during Home load + 3 s idle.

## 3. Engine parity
See `engine-parity.txt`: 5 Hint positions + 5 Computer (Expert) positions incl. doubles 6-6, 4-4, 2-2: 10/10 identical.
