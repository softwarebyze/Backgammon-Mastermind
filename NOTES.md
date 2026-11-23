# Drag-fix evidence for PR #385 @ e188f0ad

Local Playwright against the Expo web dev server at `http://127.0.0.1:8081` built from `e188f0adbc81e15671d33df01663cbffa575b3b7` (`fix(web): keep checker-drag pointer capture on a stable target`). Chromium desktop 1280×800 and WebKit iPhone 15 Pro. PostHog routes aborted. Same mouse path QA used.

## Root cause

react-native-gesture-handler 3's web `PointerEventManager` calls `setPointerCapture` on `event.target` and treats `lostpointercapture` as a cancel. Point and bar Pressables are `role="button"` (or `adjustable` in the editor) and remount their inner checkers when a point becomes selected in `onBegin`. Capture was landing on that checker, so the node disappeared mid-drag, the pan cancelled before `onEnd`, and `handleDragEnd` never committed the move. Selection and legal-target highlights still appeared because `handleDragAttempt` had already run. Tap-to-move was unaffected. Production (gesture-handler 2) did not cancel this way.

The fix wraps the `GestureDetector` child in a stable web-only `GestureHitTarget` (`pointerEvents="box-only"`) and sets the inner Pressable to `pointerEvents="none"` so capture stays on the wrapper. Native is unchanged.

## Results

Opening 3-1, drag 8→5, then drag 6→5:

| browser | 8→5 | 6→5 |
|---|---|---|
| Chromium 1280×800 | PASS (8: 3 white → 2 white, 5: empty → 1 white) | PASS (6: 5 white → 4 white, 5: 1 white → 2 white) |
| WebKit iPhone 15 Pro | PASS (same counts) | PASS (same counts) |

- Chromium stills: [opening](chromium-00-opening-31.png) · [after 8→5](chromium-01-after-8-to-5.png) · [after 6→5](chromium-02-after-6-to-5.png) · [video](chromium-drags.webm)
- WebKit stills: [opening](webkit-00-opening-31.png) · [after 8→5](webkit-01-after-8-to-5.png) · [after 6→5](webkit-02-after-6-to-5.png) · [video](webkit-drags.webm)
- Raw results: [results.json](results.json)
