# Website (web + marketing)

Canonical site: **https://backgammon-mastermind.vercel.app**

| Path | What |
|------|------|
| `/` | Playable web app (current home) |
| `/game`, `/settings`, `/learn`, … | App routes (SPA — needs Vercel rewrite) |
| `/privacy/` | Hosted privacy policy (App Store URL) |
| `/terms/` | Hosted terms |

Deploy: Vercel build `expo export -p web` → `dist` (see Vercel project settings). `vercel.json` SPA-rewrites deep links; legal pages and share icons (`apple-touch-icon.png`, `favicon.png`) are static files under `public/`.

The preview is an Expo **SPA** (`web.output` default `single`). Share-sheet / favicon tags must live in **`public/index.html`** — Expo uses that file as the HTML template for both `pnpm web` and `expo export`. `src/app/+html.tsx` only applies to static/SSR output, so a Vercel preview will not pick it up.

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

## Links to the apps (#350)

| Piece | Where | What it does |
|------|-------|--------------|
| `/.well-known/apple-app-site-association` | `public/.well-known/` | iOS universal links for `75M38Z9JBF.com.backgammonmastermind` on `/`, `/game*`, `/learn*`, `/settings` |
| `/.well-known/assetlinks.json` | `public/.well-known/` | Android App Links for `com.backgammonmastermind` |
| `associatedDomains` / `intentFilters` (`autoVerify`) | `app.config.ts` | Production app claims `backgammon-mastermind.vercel.app` (preview/dev builds don't) |
| `apple-itunes-app` meta | `public/index.html` (+ `src/app/+html.tsx`) | Safari Smart App Banner; `app-argument` is the current URL |
| "Get the app" pill + Settings section | `src/features/get-app/` | Web only. Android → Google Play, desktop → both stores, iOS non-Safari → App Store, iPhone Safari → none (banner covers it) |

`vercel.json` serves both files with `Content-Type: application/json`, and the SPA rewrite skips `/.well-known/`.

**Android fingerprints.** `assetlinks.json` must list the SHA-256 of the key that signs what users install. For Play installs that is Google's **Play App Signing** key, not the EAS upload key. Copy it from Play Console → Backgammon Mastermind → Test and release → App integrity → App signing → "App signing key certificate" → SHA-256, and add it to `sha256_cert_fingerprints` (the EAS upload key, from `eas credentials -p android` → production, is already there for directly installed builds). Check with `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://backgammon-mastermind.vercel.app&relation=delegate_permission/common.handle_all_urls`.

**iOS.** The Associated Domains capability must be on for the `com.backgammonmastermind` App ID. EAS turns it on during the next production build when it manages signing; links only start working in a binary built after this change. Apple's CDN caches the AASA, so allow up to a day after deploy.
