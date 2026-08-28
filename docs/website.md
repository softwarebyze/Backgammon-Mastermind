# Website (web + marketing)

Canonical site: **https://backgammon-mastermind.vercel.app**

| Path | What |
|------|------|
| `/` | Playable web app (current home) |
| `/game`, `/settings`, `/learn`, … | App routes (SPA — needs Vercel rewrite) |
| `/privacy/` | Hosted privacy policy (App Store URL) |
| `/terms/` | Hosted terms |

Deploy: Vercel build `expo export -p web` → `dist` (see Vercel project settings). `vercel.json` SPA-rewrites deep links; legal pages and share icons (`apple-touch-icon.png`, `favicon.png`) are static files under `public/`.

## Deep links were 404ing

Opening `/game` (etc.) on Vercel returned `NOT_FOUND`. Root `/` worked. EAS Hosting (`*.expo.app`) already fell back correctly. Fix: `vercel.json` rewrite → `index.html`.

## Marketing site — recommended approach

**Do not** spin up a second repo yet. Same domain, same deploy:

1. **Now (done):** hosted privacy/terms + working deep links.
2. **Next:** a web-only **landing** at `/` (or `/welcome`) that sells the product:
   - Brand + one sentence
   - Short demo (Remotion clip or “Play in browser”)
   - App Store / Play CTAs (when live)
   - Link into the real app (`/play` or keep current home as `/app`)
3. Native app keeps today’s home screen; only **web** gets the marketing shell.

Why this beats a separate marketing site right now: one deploy, one domain for App Store `marketingUrl` + privacy URL, playable demo is the product itself (best conversion).

Escape hatch later: a Framer/Webflow page on a custom domain that CTAs into this Vercel app — only if design wants a totally different stack.

## Custom DNS (optional)

If you add `www.yourdomain.com` → Vercel project, deep routes still work via the same rewrite. Real DNS “subdomains” (`app.`, `www.`) are project domain settings, not app code.
