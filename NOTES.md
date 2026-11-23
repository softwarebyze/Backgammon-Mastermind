# Drag-fix evidence for PR #385 @ e188f0ad

Playwright real-browser drags of opening 8→5 and then 6→5, in Chromium desktop 1280×800 and WebKit iPhone 15 Pro. PostHog routes aborted. Same mouse path QA used.

Head: `e188f0adbc81e15671d33df01663cbffa575b3b7` (`fix(web): keep checker-drag pointer capture on a stable target`).

Preview: https://backgammon-mastermind-864ujgc4u-softwarebyzes-projects.vercel.app
Vercel inspector: https://vercel.com/softwarebyzes-projects/backgammon-mastermind/3fZnrpfd4FsM4KfQ68BXE97qNMKj

## Root cause

react-native-gesture-handler 3's web `PointerEventManager` calls `setPointerCapture` on `event.target` and treats `lostpointercapture` as a cancel. Point and bar Pressables are `role="button"` (or `adjustable` in the editor) and remount their inner checkers when a point becomes selected in `onBegin`. Capture was landing on that checker, so the node disappeared mid-drag, the pan cancelled before `onEnd`, and `handleDragEnd` never committed the move. Selection and legal-target highlights still appeared because `handleDragAttempt` had already run. Tap-to-move was unaffected. Production (gesture-handler 2) did not cancel this way.

The fix wraps the `GestureDetector` child in a stable web-only `GestureHitTarget` (`pointerEvents="box-only"`) and sets the inner Pressable to `pointerEvents="none"` so capture stays on the wrapper. Native is unchanged.

## Results

All four drags passed on the local Expo web server and again on the commit-pinned Vercel preview:

| target | browser | 8→5 | 6→5 |
|---|---|---|---|
| local `http://127.0.0.1:8081` | Chromium 1280×800 | PASS (8: 3→2 white, 5: empty→1 white) | PASS (6: 5→4 white, 5: 1→2 white) |
| local `http://127.0.0.1:8081` | WebKit iPhone 15 Pro | PASS | PASS |
| Vercel preview | Chromium 1280×800 | PASS | PASS |
| Vercel preview | WebKit iPhone 15 Pro | PASS | PASS |

Local stills and clips:

- Chromium: [opening](chromium-00-opening-31.png) · [after 8→5](chromium-01-after-8-to-5.png) · [after 6→5](chromium-02-after-6-to-5.png) · [video](chromium-drags.webm)
- WebKit: [opening](webkit-00-opening-31.png) · [after 8→5](webkit-01-after-8-to-5.png) · [after 6→5](webkit-02-after-6-to-5.png) · [video](webkit-drags.webm)
- [results.json](results.json)

Preview stills and clips:

- Chromium: [opening](preview-chromium-00-opening-31.png) · [after 8→5](preview-chromium-01-after-8-to-5.png) · [after 6→5](preview-chromium-02-after-6-to-5.png) · [video](preview-chromium-drags.webm)
- WebKit: [opening](preview-webkit-00-opening-31.png) · [after 8→5](preview-webkit-01-after-8-to-5.png) · [after 6→5](preview-webkit-02-after-6-to-5.png) · [video](preview-webkit-drags.webm)
- [preview-results.json](preview-results.json)
