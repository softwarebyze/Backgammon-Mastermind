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

### Send lifecycle — there is no delivery confirmation

Messages exposes exactly two sending callbacks and nothing else:

| Callback | Meaning |
| --- | --- |
| `conversation.insert(_:completionHandler:)` completion | Only that the bubble was **staged** in the composer. The user can still delete it. |
| `didStartSending(_:conversation:)` | The user tapped send. **Optimistic** — a send can still fail afterwards. |
| `didCancelSending(_:conversation:)` | The user deleted the staged draft. |

There is **no** delivery-received or send-failed callback, so “commit the turn
only once it is confirmed delivered” is not implementable. What the session does
instead:

- `markStaged()` → the turn is frozen (`needsRoll`, `tapPoint`, `loadNewGame` and
  `shouldAdopt` all refuse) because the staged bubble already announces that the
  *opponent* is to move. Allowing local play on top of that put two contradictory
  claims on screen at once.
- `markSending()` → keeps the board, the dice **and** the undo snapshots. It
  deliberately does *not* clear `moveHistory`: that is what lets `retrySend()`
  rebuild a byte-identical payload, and the button then reads **Send again**.
  Undo stays refused while the turn is out.
- `didCancelSending` → `failToStage`, so a deleted draft returns the turn instead
  of wedging Send as “Staged” forever.

**Known gap:** iOS tears the extension process down shortly after `dismiss()`,
so the `markSending` → reopen window is narrow in practice. Closing it properly
means persisting the pending turn (app-group `UserDefaults`) and reconciling it
against the conversation on next launch — which needs a decision about staleness,
cleanup, and what to do when the opponent *did* reply. Not built yet.

Two further constraints worth knowing before touching this code:

- `conversation.insert`'s completion runs on a **background queue**, and
  `failToStage` publishes `@Published` state that SwiftUI reads. It must hop to
  main first or `ImBoardView` gets its update on the wrong queue. There is a
  parity guard (`send.failToStageOnMainThread`) that fails if the hop is dropped.
- On a simulator with no signed-in Apple ID, `localParticipantIdentifier` does
  not match, so `isFromMe` returns false and a device will adopt **its own**
  bubble. Device testing (or signing both simulators into the same Apple ID) is
  the supported path for two-player verification.

## Dice use is enforced from the legal-move list, not the raw one

`imSequences` (compound moves) and `applySequence` both go through
`imLegalMoves` on each node's own board. This matters in both directions:

- Building chains from `imRawSingleStepMoves` **under**-found them — a
  continuation onto a square that was empty at the start was never discovered,
  so points reported *no legal move* when they plainly had some.
- Building them from the raw list also **over**-offered them. A move can strand
  the other die when a different first move would have played both, so the UI
  offered turns that USBGF forbids and narrated the result as a pass. Concretely:
  one checker on the bar, one on point 4, Black blocking 22 and 2, roll 1–2 —
  entering 24 with the 1 strands the 2, while entering 23 with the 2 then
  playing 4>3 uses both.

Single-die destinations stay available on purpose; depth-1 destinations are
exactly `imLegalMoves`. The parity harness asserts both halves as exact
invariants over 500+ positions from played-out games (`mustUse.
firstStepLegalRandomized`, `mustUse.noMissingLegalMovesRandomized`) rather than
by heuristic.

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
  Same for `.preview.messages` (preview TestFlight path).
- The plugin pins `DEVELOPMENT_TEAM=75M38Z9JBF` on the extension target:
  Xcode 14+ signs resource bundles by default and EAS cloud archives fail
  with "requires a development team" without it (local builds had passed it
  via CLI, masking the gap).
- Xcode-managed team profiles go stale: after portal changes (new devices),
  refresh via Xcode → Settings → Accounts → Download Manual Profiles, then
  rebuild with `-allowProvisioningUpdates`. If Xcode reports devices as
  unregistered that EAS `device:list` shows, the Accounts session needs
  re-login.
- Simulator builds need no profiles (`CODE_SIGNING_ALLOWED=NO` suffices for
  compiling), but the simulator's plugind would not index the appex in our
  testing (see Status below) — device testing is the supported path.

## RESOLVED: the extension point identifier was wrong

`targets/imessage/Info.plist` declared
`NSExtensionPointIdentifier = com.apple.messages`. **That is not a valid iMessage
extension point.** The correct value is `com.apple.message-payload-provider`
(Apple's docs; every shipping iMessage app; `csark0812/expo-targets` ships the
same value at `characteristics.ts:223`).

One line, and everything downstream unblocked: the extension now appears in the
Messages drawer, launches, renders the board, rolls, validates moves, and sends
turns between two devices.

Do not trust the old "eliminated" verdict below — the supporting evidence was
worthless. `git log --all -S 'message-payload-provider'` finds that string **only
in this doc**, never in `targets/imessage/Info.plist` or the plugin. Since `/ios`
is gitignored and `plugins/with-imessage-extension.js:59` re-copies
`targets/imessage/Info.plist` on every prebuild, the earlier experiment was a
hand-edit of the generated plist and was overwritten by the next
`expo prebuild` before it could be observed. **Edit `targets/imessage/`, never
`ios/`.**

Corollary: the whole store-signing investigation below was chasing a phantom.
Signing was never the reason the drawer was empty — so do **not** reach for
`fastlane spaceauth` or EAS credential surgery to fix a missing extension.

## Store signing — SOLVED locally (no portal login, no EAS)

**Root cause of "one profile missing": `com.backgammonmastermind.preview.messages`
was never actually registered in App Store Connect.** The EAS Developer Portal API
listed it as an app identifier, but `GET /v1/bundleIds` (ASC API) returned 38 ids
including `…development.messages` and **not** `…preview.messages`. A
half-registered identifier cannot be profile-bearing, which is why EAS could not
provision it and why the earlier note "registered via EAS `createAppleAppIdentifier`"
was misleading.

Fixed from the terminal, no portal clicking, using the ASC key that
`scripts/asc-api-key-from-eas.mjs` exports to `.cache/asc-api-key.json`:

```sh
node scripts/asc-api-key-from-eas.mjs
fastlane sigh -a com.backgammonmastermind.preview.messages \
  -n "BM store preview messages" --api_key_path .cache/asc-api-key.json
```

fastlane ≥2.237 `sigh` defaults to **App Store** profiles and authenticates with an
ASC API key (it no longer needs a portal session). Before registering the id,
`sigh` fails with `Could not find App ID with bundle identifier …`.

Resulting profile: `BM store preview messages`,
uuid `91265f72-76fc-4421-a445-9fbbb122c3f8`, `IOS_APP_STORE`,
`get-task-allow = False`, expiring 2027-02-03, embedding EAS's own distribution
cert `7CFD35DD0FB6AB2AA0A402D28F7F3AEF`. Bundle id `98Q8ACHVK9`.

**Real, and now bypassed rather than fixed: EAS still never provisions extension
targets. See "SOLVED: shipping to TestFlight" below for the local path that does
work — the short version is that the profiles were fine and only the certificate
needed to be local.**
With the profile present, `eas build --profile preview --platform ios` still fails
identically:

```
No profiles for 'com.backgammonmastermind.preview.messages' were found: Xcode
couldn't find any iOS App Development provisioning profiles matching
'com.backgammonmastermind.preview.messages'. Automatic signing is disabled…
(in target 'BackgammonMastermindMessages')
```

EAS resolves credentials for the main bundle id only; the appex falls through to
Xcode with automatic signing off. This is an EAS gap for extensions injected by a
**local config plugin** (managed plugins are covered). Xcode cannot self-heal it
either — this machine has no Apple account signed into Xcode (no
`~/Library/Developer/Xcode/UserData/Accounts`), so there is nothing to run
`-allowProvisioningUpdates` against.

Two devices were driven for real (see below), using ad-hoc profiles that already
existed locally — `BM adhoc messages` for `…development.messages` and EAS's
`*[expo] com.backgammonmastermind.development AdHoc …` for the host app, both of
which already contained the target devices. So the TestFlight detour was never
needed to prove the concept.

## SOLVED: shipping to TestFlight without portal login or EAS

**App Store Connect accepted `com.backgammonmastermind.preview` 1.0.3 (build 12),
extension embedded, `processingState = VALID`.** No `fastlane spaceauth`, no
browser Apple ID login, no EAS credentials.

The insight that unblocks it: **the App Store profiles already existed** — they
were just bound to EAS's distribution certificate, whose private key is not on
this machine. Only the *certificate* had to be local.

### Steps

1. **Local key + certificate.** Generate the key locally, then register its CSR
   through the ASC API so the private key never leaves the machine:

   ```sh
   openssl genrsa -out dist.key 2048
   openssl req -new -sha256 -key dist.key -out dist.csr \
     -subj "/CN=iOS Distribution: Zachary Ebenfeld (75M38Z9JBF)"
   ```

   `POST /v1/certificates` with `{ type: "certificates", attributes: {
   certificateType: "IOS_DISTRIBUTION", csrContent: <csr> } }`. Auth is the same
   ES256 JWT `scripts/asc-version-status.mjs` already builds from
   `.cache/asc-api-key.json`.

2. **Import the identity.** The API returns the `.cer`; the key stays local, so
   pair them into a `.p12` and add it to the login keychain:

   ```sh
   openssl x509 -inform der -in dist.cer -out dist.pem
   # -legacy is required: openssl 3's default PBES2/AES p12 fails
   # "MAC verification failed" on `security import`.
   openssl pkcs12 -export -legacy -inkey dist.key -in dist.pem -out dist.p12 \
     -passout "pass:$PW" -name "iPhone Distribution: Zachary Ebenfeld (75M38Z9JBF)"
   security import dist.p12 -k ~/Library/Keychains/login.keychain-db -P "$PW" \
     -T /usr/bin/codesign -T /usr/bin/security
   security set-key-partition-list -S apple-tool:,apple: -s -k "$PW" \
     ~/Library/Keychains/login.keychain-db
   ```

3. **Profiles for *both* bundle ids**, bound to that certificate —
   `POST /v1/profiles` with `profileType: "IOS_APP_STORE"` and relationships to
   `bundleIds` + `certificates`. The extension needs its own: the appex profile
   is the thing EAS never provisioned. Download each from
   `GET /v1/profiles/{id}` → `attributes.profileContent`
   (**not** `/v1/profileDeviceAttributes`, which 404s), base64-decode, and
   install to `~/Library/MobileDevice/Provisioning Profiles/<uuid>.mobileprovision`.

4. **Point both targets at them** and archive. `ios/` is gitignored and
   regenerated by prebuild, so this is a scratch edit:

   ```sh
   EXPO_PUBLIC_APP_ENV=preview npx expo prebuild --platform ios --clean
   ```

   `PROVISIONING_PROFILE_SPECIFIER` is per-target, so it cannot be passed on the
   `xcodebuild` command line — edit the four `XCBuildConfiguration` blocks
   (Release + Debug × host + appex) with `CODE_SIGN_STYLE = Manual`,
   `DEVELOPMENT_TEAM = 75M38Z9JBF`, `CODE_SIGN_IDENTITY = "iPhone Distribution"`
   and the matching profile name.

   **Do not use `node-xcode` for this.** `updateBuildProperty` resolves targets
   via `pbxTargetByName` → `pbxItemByComment`, which compares the pbx comment
   *without* quotes — passing `"TargetName"` silently no-ops, and `writeSync()`
   corrupted `project.pbxproj` into a state `plutil` rejects. (This also means
   the existing-target path in `plugins/with-imessage-extension.js`, which passes
   a quoted `"${EXT_FOLDER}"`, is a silent no-op. Low impact — prebuild clears
   `ios/` so that path is not reachable in normal use — but it is not doing what
   its comment claims.)

5. **Bump the build number in the generated Info.plist.** Prebuild writes a
   literal `CFBundleVersion`, so `CURRENT_PROJECT_VERSION` on the command line
   does *not* reach it. Existing preview builds went to 11.

6. **Archive → export → upload.**

   ```sh
   xcodebuild archive -workspace ios/BackgammonMastermind.xcworkspace \
     -scheme BackgammonMastermind -configuration Release \
     -destination 'generic/platform=iOS' -archivePath /tmp/bm.xcarchive
   xcodebuild -exportArchive -archivePath /tmp/bm.xcarchive \
     -exportPath /tmp/bm-ipa -exportOptionsPlist /tmp/ExportOptions.plist
   fastlane pilot upload --ipa /tmp/bm-ipa/BackgammonMastermind.ipa \
     --api_key_path .cache/asc-api-key.json
   ```

   `pilot` hung past 40 minutes after the upload succeeded — check
   `GET /v1/builds?filter[app]=<ascAppId>` rather than trusting the CLI exit.

### Verified, and not verified

Verified: both bundles sign with the local cert and their own profile, the appex
carries `NSExtensionPointIdentifier = com.apple.message-payload-provider`, and
ASC accepted the bundle with the extension embedded.

Not verified: `VALID` means App Store Connect accepted and processed the
bundle. It does **not** mean the extension appears in Messages on a real device.
That needs installing build 12 from TestFlight on two devices signed into
iMessage.

### Icon validation (iris 90647 / 90649)

The first two uploads were rejected for reasons no local build can catch:

- **90647** — every icon was composited onto a transparent 4:3 canvas.
  `flatten()` is **not** enough: it makes pixels opaque but leaves a 4-channel
  image, and the validator rejects on the alpha channel *existing*. sharp wrote
  PNG colour type 6 either way; only `removeAlpha()` gives colour type 2.
- **90649** — 27x20 and 32x24 were declared with the `iphone` idiom. Apple's
  template declares them `universal` + `platform: ios`, and the asset compiler
  **silently drops** unrecognised idioms, so those files never reached the appex.
  Slot list now copied from `Sticker Pack Extension Component.xctemplate`.

`scripts/generate-imessage-icons.test.ts` guards both.

Superseded by the local path above. Kept for reference — these were the options
before that worked:

1. **`fastlane spaceauth -u <apple id>` once** (browser Apple ID login), then
   everything is terminal again: portal cert IDs, profiles bound to any chosen
   certificate, and TestFlight upload. Unblocks both 1 and 2 below.
2. **`credentialsSource: "local"` + hand-written `credentials.json`.** eas-cli's
   `SetUpBuildCredentialsFromCredentialsJson` does iterate every target, and
   `ensureAllTargetsAreConfigured` names the missing key. Keys are **Xcode target
   names**, not bundle ids: `BackgammonMastermind` and `BackgammonMastermindMessages`,
   each `{ provisioningProfilePath, distributionCertificate: { path, password } }`.
   Needs a `.p12` whose certificate matches the profile — cert `7CFD35DD…` is
   EAS-managed and its key is not on this machine, so this needs a second App Store
   profile bound to the local keychain cert `09B6E1E486F18A9EC023E60C5949E8A03A34C023`.
3. **Fully local `xcodebuild archive` → export ipa → upload via iTMSTransporter**
   with the ASC key. Most control, most moving parts, and still needs a profile
   bound to a locally-held certificate.

## Status: solved (was "the one remaining blocker")

The extension was invisible in the Messages drawer on every target tested
(simulator ×2, iPhone 13 Pro Max, iPad). Cause: the extension point identifier in
`targets/imessage/Info.plist` was `com.apple.messages` instead of
`com.apple.message-payload-provider`. See the RESOLVED section above.

Verified end-to-end after the fix: extension listed in the drawer → expanded
board renders → roll 6–4 → legal-move highlighting (select a checker, green
destinations) → move 24→18 and 24→20 → **Send turn** → bubble
"White played 6–4 — your move, Black" inserted into the conversation → the other
device taps the bubble and plays the other side. Sides alternate from the turn
counter in the payload, so no per-device color assignment is needed.

What was eliminated, with evidence:

| Hypothesis | Verdict |
| --- | --- |
| **Wrong extension point** | **THIS WAS IT.** `com.apple.messages` is not a valid iMessage extension point; `com.apple.message-payload-provider` is. The earlier "eliminated" verdict was based on an experiment that prebuild overwrote. |
| Missing storyboard entry | Eliminated as sole cause; kept — matches Apple's template. Not required, but harmless. (expo-targets omits it entirely and uses `NSExtensionPrincipalClass`.) |
| Missing icons | Eliminated as sole cause; kept — required for store validation. |
| Bad bundle id / prefix | Eliminated: `com.backgammonmastermind.development.messages`, registered in portal, prefix-correct. |
| Bad signature / profile | Eliminated: ad-hoc installs verify, launch, and now list in the drawer. |
| Dev/ad-hoc vs store signature filtering | **Eliminated** — ad-hoc signed builds list and play fine. Store signing was never required. |
| `simctl`/`devicectl` install path | Eliminated: both simctl and devicectl installs register the extension. The "pure-native repro also invisible" note was this same bug. |
| Xcode Run install path | Eliminated — same root cause. |

Remaining known gaps (not blockers):

1. **EAS cannot provision the extension target** (see store-signing section). A
   TestFlight build needs one of the manual paths listed there. Worth filing
   upstream, since `expo-targets` reports having fixed EAS support in 0.2.5.
2. **Simulators cannot demo two-device play** — no Apple Account is signed in, so
   iMessage has no real route between them. Real devices both have iMessage
   working, which is what we used.
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
- **EAS cloud builds:** `app.config.ts` declares the extension in
  `extra.eas.build.experimental.ios.appExtensions`
  ([Expo docs](https://docs.expo.dev/build-reference/app-extensions/)). Without
  it EAS provisions the host bundle id only, and the appex fails with
  "No profiles for '<app-id>.messages' were found".
- **One-time per flavor:** EAS has no credentials for `<app-id>.messages` yet,
  and `--non-interactive` (CI) builds cannot create them. Run
  `EXPO_PUBLIC_APP_ENV=<flavor> eas credentials -p ios`, pick the profile, sign
  in to Apple, then Build Credentials → set up all required credentials (reuse
  the existing distribution certificate). After that, CI builds sign both targets.
- Until that is done, use the local path above for Store/TestFlight builds.
- The `<app-id>.messages` bundle id must be registered in App Store Connect
  Identifiers. Both preview ids are (`…preview`, `…preview.messages`), as are the
  production-side `com.backgammonmastermind` and
  `com.backgammonmastermind.development[.messages]`.
- Icons ship in the appex (`Assets.car` verified in simulator builds), which
  satisfies iMessage App Store icon validation.

## Turn ownership (who may play which side)

Sides are **not** bound to a device — there are no accounts, so the position
itself decides who moves: `ImGameSession.shouldAdopt(_:isFromMe:)` is the single
gate, called from both `willBecomeActive` and `didSelect`.

1. **Never adopt your own message.** `outgoingPayload()` stamps `current` as the
   *opponent* to move, so adopting your own bubble hands you your friend's side.
   `MSMessage` has **no `isFromMe`** — authorship comes from
   `message.senderParticipantIdentifier == conversation.localParticipantIdentifier`.
   The previous `sentLatestTurn`-based echo check let you play both sides
   whenever the extension process had been relaunched or after "New game".
2. **Never rewind.** Within one game, a payload older than the turn already
   loaded is a stale echo; re-adopting it would discard a roll in progress.

Regression coverage lives in the Swift parity harness (section 8). Neuter
either guard and three checks fail:

```
ownership.rejectOwnMessage  ownership.noRewindSameBubble  ownership.rejectStaleTurn
```

This is turn discipline, **not** anti-cheat: with no accounts, whoever controls
both devices can still play both sides, and a modified client can forge any
payload. That trade-off is deliberate for v1.

## Verification done so far (no device needed)

- `xcodebuild -target BackgammonMastermindMessages -sdk iphonesimulator build` → **BUILD SUCCEEDED**.
- `pnpm type-check`, `pnpm lint` (0 errors), `pnpm test src/lib/imessage` (15 tests).
- Swift↔TS parity harness: TS vectors from
  `scripts/imessage-parity-vectors.ts` asserted by the Foundation-only Swift
  runner in `targets/imessage/parity/main.swift` (codec round-trips incl.
  `+`/space handling, opening/bar/bear-off/doubles move generation,
  checker-balance rejection, turn-ownership and bear-off reachability,
  compound moves through the real tap path, undo, the mandatory-dice-use
  invariants, and the send/retry contract) — **187 assertions PASS**.
  Stable over five consecutive runs: the suite rolls real dice, so flakiness
  matters and a single green run is not evidence.
  Re-run: `pnpm dlx tsx scripts/imessage-parity-vectors.ts`, then
  `xcrun swiftc targets/imessage/parity/main.swift targets/imessage/Sources/GameEngine.swift targets/imessage/Sources/MessagePayload.swift targets/imessage/Sources/GameSession.swift -o /tmp/parity && /tmp/parity`.

  Note the harness reads `MessagesViewController.swift` and `BoardView.swift` as
  **text** for two wiring guards (`send.failToStageOnMainThread`,
  `send.resendWired`), so it must be run from the repo root. Those two files are
  otherwise not compiled by the harness — type-check them with
  `xcrun swiftc -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" -target arm64-apple-ios16.0-simulator -typecheck targets/imessage/Sources/*.swift`.

  Use **`xcrun swiftc`**, not bare `swiftc`: this machine has Swiftly's Swift
  5.6 first on `PATH`, and it cannot parse the Xcode 26 SDK
  (`unknown argument: '-enable-upcoming-feature'`). The harness now also compiles
  `GameSession.swift`, which needs Combine and so only builds against the Xcode
  toolchain.

## Deliberate v1 limits

- No opening-roll ceremony — the creator plays White and moves first.
- No doubling cube / match score / Crawford (single games only).
- Dice are rolled locally on each device (same trust model as Backgammon Match
  casual play); no anti-cheat.
- Bubble has a text caption only (no rendered board snapshot image yet).
- Extension icons ship as a stickers icon set (`Assets.car` in the appex).
- Requires real two-party Messages testing (provisioning + devices) before
  calling it “fully working” end-to-end — see Prerequisites.
