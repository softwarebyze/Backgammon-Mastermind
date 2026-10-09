# #242 (9f23746) vs main: hint toggle sweep

Playwright Chromium, local web builds (main = 8084c5e, the PR's base; main since then only changed analytics files). Mobile sizes use touch/mobile emulation; 1280+ widths are desktop. Each run: closed → open → closed → open → closed. Values are board width×height @ top y (CSS px), from the first closed and first open state; the "still" check covers all 5 states. "Reserve" = extra height the closed action slot keeps for the hint card (0–56px; main 0). The closed board must match main exactly.

## Small phones

| Viewport | main closed | main open | #242 closed | #242 open | #242 reserve (px) | Verdict |
|---|---|---|---|---|---|---|
| 320x568 | 296×206 @150 | 224×150 @150 | 296×206 @150 | 224×150 @150 | 0 | resizes on toggle, same as main (h -56, y +0) |
| 360x640 | 360×278 @150 | 312×222 @150 | 360×278 @150 | 312×222 @150 | 0 | resizes on toggle, same as main (h -56, y +0) |
| 375x667 | 375×306 @149 | 343×250 @149 | 375×306 @149 | 343×250 @149 | 0 | resizes on toggle, same as main (h -56, y +0) |
| 360x740 | 360×334 @172 | 360×322 @150 | 360×334 @149 | 360×322 @150 | 45 | moves on toggle, less than main: h -12, y +1 (main h -12, y -22) |
| 360x800 | 360×334 @202 | 360×334 @174 | 360×334 @174 | 360×334 @174 | 56 | OK: still on toggle |

## Large phones

| Viewport | main closed | main open | #242 closed | #242 open | #242 reserve (px) | Verdict |
|---|---|---|---|---|---|---|
| 390x844 | 390×368 @207 | 390×368 @179 | 390×368 @179 | 390×368 @179 | 56 | OK: still on toggle |
| 393x852 | 393×372 @209 | 393×372 @181 | 393×372 @181 | 393×372 @181 | 56 | OK: still on toggle |
| 412x915 | 412×394 @229 | 412×394 @201 | 412×394 @201 | 412×394 @201 | 56 | OK: still on toggle |
| 430x932 | 430×416 @227 | 430×416 @199 | 430×416 @199 | 430×416 @199 | 56 | OK: still on toggle |

## Foldable / tablets (portrait)

| Viewport | main closed | main open | #242 closed | #242 open | #242 reserve (px) | Verdict |
|---|---|---|---|---|---|---|
| 540x720 | 464×358 @150 | 400×302 @150 | 464×358 @150 | 400×302 @150 | 0 | resizes on toggle, same as main (h -56, y +0) |
| 600x960 | 600×504 @197 | 600×504 @169 | 600×504 @169 | 600×504 @169 | 56 | OK: still on toggle |
| 768x1024 | 720×504 @229 | 720×504 @201 | 720×504 @201 | 720×504 @201 | 56 | OK: still on toggle |
| 820x1180 | 720×504 @307 | 720×504 @279 | 720×504 @279 | 720×504 @279 | 56 | OK: still on toggle |
| 1024x1366 | 768×728 @278 | 768×728 @250 | 768×728 @250 | 768×728 @250 | 56 | OK: still on toggle |

## Landscape / desktop

| Viewport | main closed | main open | #242 closed | #242 open | #242 reserve (px) | Verdict |
|---|---|---|---|---|---|---|
| 667x375 | 411×310 @65 | 411×310 @65 | 411×310 @65 | 411×310 @65 | – (landscape) | same as main (still); ⚠️ card clipped in rail (same on main); Card clipped at bottom of the side rail and "Back to my turn" cut at the right edge (rail scrolls 42px). Same on main, not from #242. |
| 844x390 | 428×326 @64 | 428×326 @64 | 428×326 @64 | 428×326 @64 | – (landscape) | same as main (still) |
| 932x430 | 476×366 @64 | 476×366 @64 | 476×366 @64 | 476×366 @64 | – (landscape) | same as main (still) |
| 1280x500 | 568×436 @64 | 568×436 @64 | 568×436 @64 | 568×436 @64 | – (landscape) | same as main (still) |
| 1280x720 | 912×656 @64 | 912×656 @64 | 912×656 @64 | 912×656 @64 | – (landscape) | same as main (still) |
| 1366x1024 | 998×728 @180 | 998×728 @180 | 998×728 @180 | 998×728 @180 | – (landscape) | same as main (still) |
| 1440x900 | 1000×728 @118 | 1000×728 @118 | 1000×728 @118 | 1000×728 @118 | – (landscape) | same as main (still) |
| 1920x1080 | 1000×728 @208 | 1000×728 @208 | 1000×728 @208 | 1000×728 @208 | – (landscape) | same as main (still) |

## Long suggested move (wraps to 2 lines, injected)

| Viewport | main closed | main open | #242 closed | #242 open | #242 reserve (px) | Verdict |
|---|---|---|---|---|---|---|
| 320x568 | 296×206 @150 | 208×130 @150 | 296×206 @150 | 208×130 @150 | 0 | resizes on toggle, same as main (h -76, y +0) |
| 360x640 | 360×278 @150 | 288×202 @150 | 360×278 @150 | 288×202 @150 | 0 | resizes on toggle, same as main (h -76, y +0) |
| 390x844 | 390×368 @207 | 390×368 @169 | 390×368 @179 | 390×368 @169 | 56 | moves on toggle, less than main: h +0, y -10 (main h +0, y -38) |
| 768x1024 | 720×504 @229 | 720×504 @201 | 720×504 @201 | 720×504 @201 | 56 | OK: still on toggle |
| 844x390 | 428×326 @64 | 428×326 @64 | 428×326 @64 | 428×326 @64 | – (landscape) | same as main (still); ⚠️ card clipped in rail (same on main) |

## All text at 130%

| Viewport | main closed | main open | #242 closed | #242 open | #242 reserve (px) | Verdict |
|---|---|---|---|---|---|---|
| 320x568 | 280×196 @158 | 200×124 @159 | 280×196 @158 | 200×124 @159 | 0 | resizes on toggle, same as main (h -72, y +1) |
| 360x640 | 360×268 @158 | 280×196 @159 | 360×268 @158 | 280×196 @159 | 0 | resizes on toggle, same as main (h -72, y +1) |
| 390x844 | 390×368 @210 | 390×368 @175 | 390×368 @182 | 390×368 @175 | 56 | moves on toggle, less than main: h +0, y -7 (main h +0, y -35) |
| 768x1024 | 720×504 @232 | 720×504 @197 | 720×504 @204 | 720×504 @197 | 56 | moves on toggle, less than main: h +0, y -7 (main h +0, y -35) |
| 844x390 | 428×326 @64 | 428×326 @64 | 428×326 @64 | 428×326 @64 | – (landscape) | same as main (still); ⚠️ card clipped in rail (same on main) |

## Summary

- Closed board identical to main: 32/32 runs
- Board still on toggle: #242 20/32, main 10/32
