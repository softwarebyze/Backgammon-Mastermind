# Marketing plan

Living plan. Assets live in this folder; how assets get made: [store-screenshots.md](../store-screenshots.md) and [releases.md](../releases.md) (Remotion renders auto-run per GitHub release).

**Status:** Instagram created, **0 posts** (as of 2026-10-12). Web landing page **not built**. App live on App Store (since v1.0.0) and Google Play (#160).

## Positioning

XG, GNUBG and Backgammon Tutor all have analysis/tutor features — do not claim to be "the only app that teaches you." The honest, defensible angles:

1. **A tutor that doesn't stop the game.** Blunder nudges in the corner with *take back* / *see correct move* — not a modal that blocks your turn (Alex Balica's framing; XG-style tutors interrupt).
2. **Learn while you're a beginner.** Interactive Learn curriculum + hints that fade in — the other apps assume you already play.
3. **Play anywhere, for free.** Full game in the browser; same account-less app on iOS, Android, web, and over iMessage.
4. **17 languages.** Almost nobody else ships Hebrew/Arabic/Hindi backgammon.

One-liner candidates:

> "Backgammon that meets you where you are — learn it, play it anywhere, get better every game."

## Instagram (@backgammonmastermind)

Cadence: **3 feed posts + 3–5 stories per week.** Formats: Reels ≤30s (use Remotion renders), carousels (teach one idea), static board graphics (puzzles).

Content pillars:

| Pillar | Why | Source material |
|--------|-----|-----------------|
| **Puzzle of the day** | Highest engagement format in chess accounts; saveable + shareable | Generate from real positions; Sage engine picks the right move |
| **60-second rules** ("what's a blot?", "how the bar works") | Reaches absolute beginners — your Learn angle | Learn curriculum copy (17 locales = free localization) |
| **Product clips** | Converts viewers to installs | `docs/marketing/videos/*.mp4` (auto-rendered per release) |
| **"Did you know" strategy** | Boomer/Gen-X backgammon audience shares text posts | backgammon.com five core strategies (attributed) |
| **Build-in-public** | Early audience + goodwill | Ship notes from GitHub releases |

**First week — post 1–3 (three feed posts, matching the cadence) plus the story; 4 and 5 can slip to week two:**

1. Trailer: `AppStorePreview.mp4` + "Play free in your browser → link in bio"
2. Carousel: "Backgammon in 60 seconds: the board, the bar, the bear-off"
3. Reel: tutor nudge clip (blunder → take back → correct move)
4. Optional: Static: "What would you play? (double 3)" — puzzle, answer in comments next day
5. Optional: Reel: iMessage challenge — "challenge your group chat without leaving the chat"
6. Story: poll — "Did you know how to play backgammon before this app?" (market research + reach)

Rules: every post ends with **"Free to play → link in bio"**. Link-in-bio → the web landing (see below), not the raw Vercel URL.

## Web marketing (highest leverage — the playable app IS the demo)

1. **Build the landing page** (docs/website.md §2): hero sentence + autoplay muted Remotion clip + **App Store / Google Play badges** + "Play free in browser". One afternoon of work; it is the link-in-bio target, the ASO `marketingUrl`, and the Instagram CTA.
2. **SEO basics on the web build:** today `public/index.html` is one shared SPA template, so every route serves the same title and description. Per-route `<title>`, meta description and Open Graph tags (with a store screenshot) need either static/SSR web output (`web.output: "static"`, where `src/app/+html.tsx` and per-route head tags apply) or crawler-visible prerendering of the key routes. Route-level head updates in the SPA alone are not reliably seen by crawlers. The free playable web game is a genuinely strong SEO asset — "play backgammon online free" is high-volume.
3. **Launch posts:** Product Hunt (Remotion trailer + screenshots ready), r/backgammon (honest "I built this" post — the mid-game review demo is the hook), BoardGameGeek forums, USBGF newsletter.
4. **ASO check:** verify `store.config.json` keywords cover: backgammon, tutor, learn, free, online, 2-player. Add screenshots showing the tutor + Learn (current set leans Learn already — good).
5. **The hero feature for all of it:** mid-game turn-by-turn review (Zack, 9/17: "a really nice feature, I should market that more"). Every clip should show scrubbing through a game with the move paths.

## Measuring

- PostHog: web visits vs. app launches by platform (already wired, `surface` property in #207/#212)
- Instagram: saves + shares > likes; track "link in bio" clicks (use a short link)
- Ask every TestFlight/App Store reviewer how they found the app (#79 in-app feedback form helps)
