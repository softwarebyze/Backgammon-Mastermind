# Verification trail: Home header back-control fix (web)

Date: September 24, 2026
Fix: `src/lib/navigation/native-stack-options.ts` — explicit `headerBackVisible: false`
(native) and `headerLeft: () => null` (web), because expo-router's web
`NativeStackView` synthesizes a `HeaderBackButton` whenever `headerLeft` is
undefined, ignoring `headerBackVisible`.

## Code identity (the strongest link)

- Local commit `27379fb`, remote commit `ef370b1d` (GitHub-API push, API-created
  commits carry different SHAs than local ones).
- After both pushes, a push helper compared the local tree against the remote
  HEAD and confirmed **exact tree equality** — byte-for-byte the same code is
  at the branch tip. Remote head: `452aa6a1c0127f26e3e3e6790429f26181ab6d88`.

## Vercel deployment of that exact head

- GitHub check-runs on commit `452aa6a1`: **"Vercel Preview Comments" =
  completed / success**. Vercel marks that check green only after its
  deployment of the exact commit succeeds and the bot comment is posted.
- Vercel bot comment on PR #188 names the deployed commit
  (`commit 452aa6a1`) and the preview URL:
  https://backgammon-mastermind-git-bgsage-demo-ci-softwarebyzes-projects.vercel.app
- Therefore: the Vercel preview Zachary tests **is** running the fix.

## Rendered verification (Expo web, real Chromium, same code)

- `npx expo start --web` on commit `27379fb` (tree-equal to `452aa6a1`).
- Viewport 390×844: no left-header control on Home; Settings gear present.
- Viewport 1280×800: same result.
- Evidence:
  - `docs/pr-evidence/188-home-header-no-back-button-390x844.png`
  - `docs/pr-evidence/188-home-header-no-back-button-desktop.png`

## Known limits (stated honestly)

- The stray Home back button was never reproduced naturally (11 targeted flows,
  120-step fuzz, multiple viewports). The fix hard-codes the invariant rather
  than removing a captured trigger, and the QA hook used during testing was
  fully removed before committing (never committed).
- The Vercel-hosted deployment could not be rendered visually from this
  environment: the datacenter egress breaks TLS to Vercel URLs
  (`ERR_EMPTY_RESPONSE` / `ERR_SSL_PROTOCOL_ERROR` on the preview URL; the
  Cloudflare quick-tunnel fallback also fails the TLS handshake from here).
  Verification of the deployed artifact rests on the chain above: Vercel's own
  successful deployment check on the exact commit + tree-equal code.
- Native iOS remains unverified (expo-router web path only was exercised).
