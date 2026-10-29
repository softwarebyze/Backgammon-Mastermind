# Post 01 — Launch Reel

First feed post for [@backgammonmastermind](https://www.instagram.com/backgammonmastermind/). Plan: [../../PLAN.md](../../PLAN.md) (first week, post 1).

| File | What | Source |
|------|------|--------|
| `instagram-launch.mp4` | 1080×1920 Reel, 14.7s, 30fps, silent | `cd remotion && pnpm render:instagram` |
| `instagram-cover.png` | 1080×1350 grid cover (4:5) | `cd remotion && pnpm still:instagram-cover` |

Beats: hook ("Learn backgammon on a real board.", visible from frame 0) → roll 3-1, legal move highlighted → tutor's move 8/5 6/5 → play anywhere / 17 languages → "Play free in your browser · Link in bio". All copy sits inside the Reels safe zone (clear of the top 300px and bottom 460px) and inside the 4:5 grid crop.

## Caption

```text
Backgammon Mastermind is here 🎲

Learn the rules on a real board, then play a real game — against the computer or with someone beside you.

→ Every legal move highlighted
→ Tutor mode flags blunders and shows the stronger move
→ Short Learn to Play lessons: the board, hitting, the bar, bearing off
→ iPhone, iPad, Android and web, in 17 languages

Opening roll 3-1? Make your 5-point: 8/5 6/5.

Free to play in your browser → link in bio

#backgammon #boardgames #strategygames #tavla #tavli
```

Copy rules this follows (from PLAN.md and the store listing):

- Say "free **in your browser**". The App Store build is a one-time purchase, so never "free app".
- Do not say the tutor "doesn't stop the game". Today it opens a sheet (`guidance-modal.tsx`).
- Do not claim to be the only app that teaches.

## Alt text (Advanced settings → Accessibility)

```text
Animated backgammon board in dark wood, red and gold. Text: "Learn backgammon on a real board." A 3-1 roll is shown with the legal point highlighted, then the tutor's move 8/5 6/5 making the 5-point. Ends with the Backgammon Mastermind logo and "Play free in your browser. Link in bio."
```

## Posting checklist

1. Bio link: `https://linktr.ee/backgammonmastermind`. Check it lists **Play in browser** (https://backgammon-mastermind.vercel.app) first, then App Store and Google Play.
2. New post → **Reel** → upload `instagram-launch.mp4`.
3. Audio: the render is silent. Add a track from Instagram's library. Business accounts only get the commercial-safe library, which is fine for a product post. Keep it low-key.
4. Cover → **Add from camera roll** → `instagram-cover.png`. Check the grid preview shows the full headline.
5. Paste the caption and alt text. Keep "Also share to Feed" on.
6. After posting, pin it to the profile grid (⋯ → Pin to your profile).
7. Next day: share it to Stories with the poll from PLAN.md ("Did you know how to play backgammon before this app?").

## Measuring

Note the date posted. After 48h and again at 7 days, record reach, saves, shares, and Linktree clicks here, before post 02.
