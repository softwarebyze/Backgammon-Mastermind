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

In Xcode: select the **BackgammonMastermindMessages** scheme → run on two
simulators/devices signed into different Apple IDs (or one device + TestFlight
for a second player) → open Messages, start a conversation, open the app drawer,
play. The simulator's Messages app can host the extension UI; sending between
two local simulators requires Apple-ID sign-in on both.

> Pod note: if `pod install` fails with a `UnicodeNormalize` crash, your shell
> isn't UTF-8 — `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` first.

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
- Extension icon set is the default — add a Messages app-icon asset before
  App Store submission (App Store validation requires it).
- Requires real two-party Messages testing (provisioning + devices) before
  calling it “fully working” end-to-end — see Prerequisites.
