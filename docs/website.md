# Website (web + marketing)

Canonical site: **https://backgammon-mastermind.vercel.app**

| Path | What |
|------|------|
| `/` | Playable web app (current home) |
| `/game`, `/settings`, `/learn`, … | App routes (SPA — needs Vercel rewrite) |
| `/privacy/` | Hosted privacy policy (App Store URL) |
| `/terms/` | Hosted terms |

Deploy: Vercel runs `pnpm build:web` (`expo export -p web` + service worker) → `dist`, set in `vercel.json`. `vercel.json` SPA-rewrites deep links; legal pages and share icons (`apple-touch-icon.png`, `favicon.png`) are static files under `public/`.

The preview is an Expo **SPA** (`web.output` default `single`). Share-sheet / favicon tags must live in **`public/index.html`** — Expo uses that file as the HTML template for both `pnpm web` and `expo export`. `src/app/+html.tsx` only applies to static/SSR output, so a Vercel preview will not pick it up.

## Offline PWA (web)

The web build installs as a PWA and works fully offline from the **first** visit: the service worker precaches every file `expo export` writes — JS bundle and lazy chunks, fonts, sounds, images and the bgsage engine (~26 MB total) — before it takes over.

| File | What |
|------|------|
| `scripts/service-worker-config.ts` | The offline contract: Workbox `generateSW` options and the list of files a build must precache. Unit-tested in `scripts/service-worker-config.test.ts`. |
| `scripts/build-service-worker.ts` | Writes `dist/sw.js` after the export; fails the build if the bundle, engine or legal pages would be missing, or if Workbox warns. |
| `pnpm build:web` | `expo export -p web` + the step above. Vercel runs this (`vercel.json` → `buildCommand`). |
| `src/lib/web/pwa.ts` | Registers `/sw.js` on web + production only, checks for updates on `visibilitychange`, shows a reload toast when a new version takes over, and asks for persistent storage when the app is installed. |
| `e2e-web/offline.pw.ts` | Playwright: visit once, shut the server down, reload, open a deep link and run the engine. CI: `.github/workflows/e2e-web.yml`. Locally: `pnpm build:web && pnpm e2e:web` (add `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome). |
| `public/manifest.webmanifest` | Install metadata; icons `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` come from `scripts/generate-brand-assets.ts`. |

How it behaves:

- every precached file carries a content hash, so a deploy re-downloads only what changed and old caches are cleaned up — **nothing to version by hand**;
- app routes are served the cached `index.html`; `/privacy` and `/terms` are their own cached pages, never the app shell;
- engine URLs carry `?v=<context>`; the worker ignores `v` when matching, since the precache revision already tracks the file content;
- cross-origin requests (PostHog) are untouched.

`vercel.json` must keep `sw.js`, `manifest.webmanifest`, `pwa-*.png` and `bgsage/` **out** of the SPA catch-all rewrite, and `/sw.js` is served with `Cache-Control: max-age=0, must-revalidate` so updates are picked up.

Limits outside our control: iOS Safari may clear a site's storage after weeks without a visit in the browser (home-screen installs are largely exempt), and any browser may evict under storage pressure unless persistent storage was granted.

## Deep links were 404ing

Opening `/game` (etc.) on Vercel returned `NOT_FOUND`. Root `/` worked. EAS Hosting (`*.expo.app`) already fell back correctly. Fix: `vercel.json` rewrite → `index.html`.

## Marketing site — recommended approach

**Do not** spin up a second repo yet. Same domain, same deploy:

1. **Done:** hosted privacy/terms + working deep links.
2. **Next (not built yet):** a web-only **landing** at `/` (or `/welcome`) that sells the product:
   - Brand + one sentence
   - Short demo (Remotion clip — the mid-game turn-by-turn review is the hero feature) or "Play in browser"
   - **App Store + Google Play CTAs — both stores are live now** (App Store since v1.0.0, July 2026; Play via #160). Link with `EXPO_PUBLIC_APP_STORE_ID` / store config.
   - Link into the real app (`/play` or keep current home as `/app`)
3. Native app keeps today's home screen; only **web** gets the marketing shell.

The Instagram (`@backgammonmastermind`) exists but has zero posts as of 2026-10-12 — the landing page and the Instagram should launch from the same asset set (Remotion renders in `docs/marketing/videos/`, store screenshots in `docs/marketing/app-store-screenshots/`). See [marketing/PLAN.md](./marketing/PLAN.md).

Why this beats a separate marketing site right now: one deploy, one domain for App Store `marketingUrl` + privacy URL, playable demo is the product itself (best conversion).

Escape hatch later: a Framer/Webflow page on a custom domain that CTAs into this Vercel app — only if design wants a totally different stack.

## Custom DNS (optional)

If you add `www.yourdomain.com` → Vercel project, deep routes still work via the same rewrite. Real DNS “subdomains” (`app.`, `www.`) are project domain settings, not app code.
