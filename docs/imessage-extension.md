# iMessage extension — turn-based play over Messages

Play full backgammon games inside iMessage, modeled on **Backgammon Match**:
one player moves, taps **Send turn**, and the position travels inside the
message bubble. The recipient taps the bubble, plays the other side, and sends
it back. No server, no accounts — the game state rides in the `MSMessage` URL,
exactly like the main app's client-only architecture.

## How a game flows

1. **A** opens Messages → Backgammon Mastermind → **New game** (plays White).
   A rolls, moves checkers, taps **Send turn**. The extension inserts an
   `MSMessage` whose `url` holds the v1 turn payload and whose caption reads
   e.g. “White played 5–2 — your move, Black”.
2. **B** taps the bubble. The extension decodes the URL and B plays Black
   (sides alternate automatically — there is no fixed color per device).
3. Repeat until someone bears off all 15 checkers; the final “White wins 🏆”
   message ends the game. `MSSession` keeps every turn in one bubble thread.

The full position (all 24 points, bar, borne-off, turn number, last-roll dice,
summary caption) is encoded in the URL query, so either side can re-open any
old bubble to review that position.

## Repo map

| Path | What |
| --- | --- |
| `src/lib/imessage/codec.ts` | **Source of truth** for the v1 wire format + `GameState` bridges + caption. Jest-covered (`codec.test.ts`). |
| `targets/imessage/Sources/GameEngine.swift` | Faithful port of `src/lib/game/moves.ts` (legal-move gen incl. USBGF max-dice/higher-die filter, bar, hits, bear-off, doubles). |
| `targets/imessage/Sources/MessagePayload.swift` | Swift mirror of the codec (decode/encode/caption). |
| `targets/imessage/Sources/GameSession.swift` | Turn session: roll → tap-to-move → send; tracks whose turn it is. |
| `targets/imessage/Sources/BoardView.swift` | SwiftUI compact + expanded board. |
| `targets/imessage/Sources/MessagesViewController.swift` | `MSMessagesAppViewController`: loads incoming bubbles, sends turns. |
| `targets/imessage/Info.plist` | Extension plist template (bundle id/version injected by the plugin). |
| `targets/imessage/Assets.xcassets/` | Committed **stickers icon set** (“iMessage App Icon”, Xcode-template slots). Regenerate with `pnpm dlx tsx scripts/generate-imessage-icons.ts` after brand changes. |
| `plugins/with-imessage-extension.js` | Expo config plugin: copies sources into `ios/` and injects the `BackgammonMastermindMessages` target (`com.apple.product-type.app-extension.messages`, `<app-id>.messages`) on every `expo prebuild`. |
| `scripts/imessage-parity-vectors.ts` | Regenerates cross-language test vectors (`pnpm dlx tsx …`). |

`ios/` is generated and gitignored — never hand-edit the extension target in
Xcode; change `targets/imessage/` or the plugin and re-run prebuild.

## Wire format (v1)

All values live in the message URL query (`https://backgammonmastermind.game/i?...`;
the host is opaque payload and never needs to resolve):

- `v=1`, `gid` (game id), `turn` (completed-turn counter), `cur` (`w`/`b` to act)
- `pts`: 24 × (owner `w`/`b`/`.` + count as one base-36 digit) — 48 chars
- `bar` / `off`: `white,black` counts; each side must total exactly 15
- `win`: `w`/`b`/empty; `d`: dice just played; `last`: caption summary (≤140c)

**Compatibility rule:** any change to this grammar must land in
`codec.ts` **and** `MessagePayload.swift` together, plus a version bump and a
new parity vector. Old bubbles with `v=1` keep decoding.

## Prerequisites (Apple side, one-time)

- Paid Apple Developer Program membership (free accounts cannot sign app
  extensions for device testing or TestFlight).
- App ID + provisioning for **both** `com.backgammonmastermind[.preview|.development]`
  and the extension `<that>.messages` (Xcode → Signing & Capabilities, or EAS
  credentials with the extension target included).
- EAS: run `eas credentials` after the first prebuild so the `.messages`
  bundle id is registered; iOS builds then sign both targets.

## Run it

```sh
git checkout feat/imessage-extension
cp .env.example .env   # if needed
npx expo prebuild --platform ios   # injects BackgammonMastermindMessages
open ios/*.xcworkspace
```

Apple's documented test flow (Xcode docs, "Running your iMessage app"): select
the Messages extension scheme → Run → choose Messages as the host when
prompted. This repo does not commit an extension scheme yet (tracked below);
until then, Run the main scheme on the device, then open Messages manually.

> Pod note: if `pod install` fails with a `UnicodeNormalize` crash, your shell
> isn't UTF-8 — `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` first.

## Signing notes (read before touching provisioning)

- Dev flavor team: **`75M38Z9JBF`** (Apple Development identity in the login
  keychain). `CJDYC6P4X3` looks like a team id but is not — passing it as
  `DEVELOPMENT_TEAM` fails with “No Account for Team”.
- Preview/production flavors may live under **different Apple IDs/teams** —
  do dev-flavor work only until the owner confirms each flavor's team.
- `com.backgammonmastermind.development.messages` was registered via EAS
  GraphQL `createAppleAppIdentifier` (parent = main app id, team 75M38Z9JBF).
- Xcode-managed team profiles go stale: after portal changes (new devices),
  refresh via Xcode → Settings → Accounts → Download Manual Profiles, then
  rebuild with `-allowProvisioningUpdates`. If Xcode reports devices as
  unregistered that EAS `device:list` shows, the Accounts session needs
  re-login.
- Simulator builds need no profiles (`CODE_SIGNING_ALLOWED=NO` suffices for
  compiling), but the simulator's plugind would not index the appex in our
  testing (see Status below) — device testing is the supported path.

## Status: the one remaining blocker

Everything builds, signs, installs, and launches — but the extension does not
appear in the Messages app drawer (simulator ×2, iPhone 13 Pro Max, iPad),
while store-signed third-party extensions (Maps, Venmo) do. No crash logs exist
for the extension: it is never indexed/launched, not failing at runtime.

What was eliminated, with evidence:

| Hypothesis | Verdict |
| --- | --- |
| Wrong extension point (`com.apple.messages`) | Eliminated: matches Apple docs, Xcode 26 template product type, and every shipping iMessage app (Backgammon Match works on the same phones). A `message-payload-provider` experiment changed nothing. |
| Missing storyboard entry | Eliminated as sole cause: added minimal `MainInterface.storyboard` mirroring Apple's template (compiled `storyboardc` verified in the appex); drawer still empty. Kept — it matches the template. |
| Missing icons | Eliminated as sole cause: full stickers icon set compiles (`Assets.car` + extracted PNGs verified). Kept — required for store validation. |
| Bad bundle id / prefix | Eliminated: `com.backgammonmastermind.development.messages`, registered in portal, prefix-correct. |
| Bad signature / profile | Eliminated as install blocker: dev + ad-hoc installs verify and launch; profiles embed correctly with all devices. |
| `simctl`/`devicectl` install path | Open: a minimal pure-native test extension (no Expo) built from Apple's template shape is equally invisible after `simctl install`, even after reboot — suggesting direct installs don't register extensions in this environment, independent of our code. |
| Dev/ad-hoc vs store signature filtering | Open: every visible third-party extension is store-signed. Untested: store-signed (TestFlight) install of ours. |
| Xcode Run install path | Open: user ran to iPad; drawer still empty. (Same installd underneath, so unsurprising in hindsight.) |

Next steps, in order:

1. **Store-signed install (TestFlight).** The single highest-signal test: EAS cloud build
   when free-plan minutes reset (Oct 1) or after a plan upgrade, then TestFlight
   on both test phones. If the drawer lists it → dev-signing was the filter;
   ship via the store path.
2. **Apple DTS / Developer Forums** with the evidence bundle (working minimal
   repro = MinMsg experiment notes above, sysdiagnose needs on-device approval).
3. **Extension scheme for one-click Runs** (nice-to-have): generate a shared
   `BackgammonMastermindMessages.xcscheme` in the plugin (needs the generated
   target UUID at prebuild time) so Xcode offers Messages as host automatically.

## Two-simulator test runbook (one Apple ID is enough)

1. Build + install on two booted simulators (Debug, simulator SDK):
   `xcodebuild -workspace ios/*.xcworkspace -scheme BackgammonMastermind -sdk iphonesimulator build`
   `xcrun simctl install <sim-A> <app.app>` (repeat for sim-B). The `.appex`
   embeds automatically (verify: `.app/PlugIns/BackgammonMastermindMessages.appex`).
2. **Owner step:** on each simulator open Settings → sign into the *same*
   Apple ID, then open Messages and enable iMessage. (Agent cannot enter
   passwords.)
3. On sim-A: new conversation to yourself → app drawer → Backgammon → New
   game → roll, move, **Send turn**.
4. On sim-B: tap the bubble → play Black → **Send turn**.
5. Back on sim-A: tap the reply → next turn. Game ends with the “wins 🏆”
   bubble. Capture screenshots/recordings per turn for the PR.

## EAS / TestFlight runbook

- The plugin derives `<app-id>.messages` per flavor automatically
  (development / preview / production — nothing extra to code).
- First build per flavor auto-provisions via the linked App Store Connect API
  key: `eas build --profile development --platform ios`, then preview, then
  production. If a build complains about the `.messages` bundle id, register
  it in Identifiers (App Store Connect) and re-run `eas credentials -p ios`.
- Icons ship in the appex (`Assets.car` verified in simulator builds), which
  satisfies iMessage App Store icon validation.

## Verification done so far (no device needed)

- `xcodebuild -target BackgammonMastermindMessages -sdk iphonesimulator build` → **BUILD SUCCEEDED**.
- `pnpm type-check`, `pnpm lint` (0 errors), `pnpm test src/lib/imessage` (15 tests).
- Swift↔TS parity harness: TS vectors from
  `scripts/imessage-parity-vectors.ts` asserted by the Foundation-only Swift
  runner in `targets/imessage/parity/main.swift` (codec round-trips incl.
  `+`/space handling, opening/bar/bear-off/doubles move generation,
  checker-balance rejection) — **24/24 PASS**.
  Re-run: `pnpm dlx tsx scripts/imessage-parity-vectors.ts`, then
  `swiftc targets/imessage/parity/main.swift targets/imessage/Sources/GameEngine.swift targets/imessage/Sources/MessagePayload.swift -o /tmp/parity && /tmp/parity`.

## Deliberate v1 limits

- No opening-roll ceremony — the creator plays White and moves first.
- No doubling cube / match score / Crawford (single games only).
- Dice are rolled locally on each device (same trust model as Backgammon Match
  casual play); no anti-cheat.
- Bubble has a text caption only (no rendered board snapshot image yet).
- Extension icons ship as a stickers icon set (`Assets.car` in the appex).
- Requires real two-party Messages testing (provisioning + devices) before
  calling it “fully working” end-to-end — see Prerequisites.
