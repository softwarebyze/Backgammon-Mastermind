# Hint toggle sweep: main (8084c5e) vs new head

Board = width×height @ top y, CSS px. Each run toggles closed → open → closed → open → closed; "closed == open" checks all five. ✗ after main open = main's board changed.

## Small phones

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 320x568 | 296×206 @150 | 224×150 @150 ✗ | 296×206 @150 | 296×206 @150 | ✅ yes | same | fully visible | fully visible |
| 360x640 | 360×278 @150 | 312×222 @150 ✗ | 360×278 @150 | 360×278 @150 | ✅ yes | same | fully visible | fully visible |
| 375x667 | 375×306 @149 | 343×250 @149 ✗ | 375×306 @149 | 375×306 @149 | ✅ yes | same | fully visible | fully visible |
| 360x740 | 360×334 @172 | 360×322 @150 ✗ | 360×334 @172 | 360×334 @172 | ✅ yes | same | fully visible | fully visible |
| 360x800 | 360×334 @202 | 360×334 @174 ✗ | 360×334 @202 | 360×334 @202 | ✅ yes | same | fully visible | fully visible |

## Large phones

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 390x844 | 390×368 @207 | 390×368 @179 ✗ | 390×368 @207 | 390×368 @207 | ✅ yes | same | fully visible | fully visible |
| 393x852 | 393×372 @209 | 393×372 @181 ✗ | 393×372 @209 | 393×372 @209 | ✅ yes | same | fully visible | fully visible |
| 412x915 | 412×394 @229 | 412×394 @201 ✗ | 412×394 @229 | 412×394 @229 | ✅ yes | same | fully visible | fully visible |
| 430x932 | 430×416 @227 | 430×416 @199 ✗ | 430×416 @227 | 430×416 @227 | ✅ yes | same | fully visible | fully visible |

## Foldable / tablets (portrait)

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 540x720 | 464×358 @150 | 400×302 @150 ✗ | 464×358 @150 | 464×358 @150 | ✅ yes | same | fully visible | fully visible |
| 600x960 | 600×504 @197 | 600×504 @169 ✗ | 600×504 @197 | 600×504 @197 | ✅ yes | same | fully visible | fully visible |
| 768x1024 | 720×504 @229 | 720×504 @201 ✗ | 720×504 @229 | 720×504 @229 | ✅ yes | same | fully visible | fully visible |
| 820x1180 | 720×504 @307 | 720×504 @279 ✗ | 720×504 @307 | 720×504 @307 | ✅ yes | same | fully visible | fully visible |
| 1024x1366 | 768×728 @278 | 768×728 @250 ✗ | 768×728 @278 | 768×728 @278 | ✅ yes | same | fully visible | fully visible |

## Mobile landscape

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 667x375 | 411×310 @65 | 411×310 @65 | 411×310 @65 | 411×310 @65 | ✅ yes | same | card cut off at bottom; rail scrolls 42px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 720x360 | 397×296 @64 | 397×296 @64 | 397×296 @64 | 397×296 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 57px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 740x360 | 394×296 @64 | 394×296 @64 | 394×296 @64 | 394×296 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 57px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 844x390 | 428×326 @64 | 428×326 @64 | 428×326 @64 | 428×326 @64 | ✅ yes | same | rail scrolls 27px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 932x430 | 476×366 @64 | 476×366 @64 | 476×366 @64 | 476×366 @64 | ✅ yes | same | fully visible | fully visible |

## Desktop

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 1280x500 | 568×436 @64 | 568×436 @64 | 568×436 @64 | 568×436 @64 | ✅ yes | same | fully visible | fully visible |
| 1280x720 | 912×656 @64 | 912×656 @64 | 912×656 @64 | 912×656 @64 | ✅ yes | same | fully visible | fully visible |
| 1366x1024 | 998×728 @180 | 998×728 @180 | 998×728 @180 | 998×728 @180 | ✅ yes | same | fully visible | fully visible |
| 1440x900 | 1000×728 @118 | 1000×728 @118 | 1000×728 @118 | 1000×728 @118 | ✅ yes | same | fully visible | fully visible |
| 1920x1080 | 1000×728 @208 | 1000×728 @208 | 1000×728 @208 | 1000×728 @208 | ✅ yes | same | fully visible | fully visible |

## Long suggested move (2 lines, injected)

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 320x568 | 296×206 @150 | 208×130 @150 ✗ | 296×206 @150 | 296×206 @150 | ✅ yes | same | fully visible | fully visible |
| 360x640 | 360×278 @150 | 288×202 @150 ✗ | 360×278 @150 | 360×278 @150 | ✅ yes | same | fully visible | fully visible |
| 375x667 | 375×306 @149 | 319×230 @149 ✗ | 375×306 @149 | 375×306 @149 | ✅ yes | same | fully visible | fully visible |
| 360x740 | 360×334 @172 | 360×302 @150 ✗ | 360×334 @172 | 360×334 @172 | ✅ yes | same | fully visible | fully visible |
| 390x844 | 390×368 @207 | 390×368 @169 ✗ | 390×368 @207 | 390×368 @207 | ✅ yes | same | fully visible | fully visible |
| 768x1024 | 720×504 @229 | 720×504 @201 ✗ | 720×504 @229 | 720×504 @229 | ✅ yes | same | fully visible | fully visible |
| 667x375 | 411×310 @65 | 411×310 @65 | 411×310 @65 | 411×310 @65 | ✅ yes | same | card cut off at bottom; rail scrolls 62px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 720x360 | 397×296 @64 | 397×296 @64 | 397×296 @64 | 397×296 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 77px; "Back to my turn" past card edge; button covered/offscreen | rail scrolls 9px; "Back to my turn" past card edge |
| 740x360 | 394×296 @64 | 394×296 @64 | 394×296 @64 | 394×296 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 77px; "Back to my turn" past card edge; button covered/offscreen | rail scrolls 9px; "Back to my turn" past card edge |
| 844x390 | 428×326 @64 | 428×326 @64 | 428×326 @64 | 428×326 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 47px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 932x430 | 476×366 @64 | 476×366 @64 | 476×366 @64 | 476×366 @64 | ✅ yes | same | rail scrolls 7px | fully visible |

## All text at 130%

| Viewport | main closed | main open | new closed | new open | new: closed == open (all 5 states)? | new closed vs main closed | main card | new card |
|---|---|---|---|---|---|---|---|---|
| 320x568 | 280×196 @158 | 200×124 @159 ✗ | 280×196 @158 | 280×196 @158 | ✅ yes | same | "Back to my turn" past card edge | "Back to my turn" past card edge |
| 360x640 | 360×268 @158 | 280×196 @159 ✗ | 360×268 @158 | 360×268 @158 | ✅ yes | same | "Back to my turn" past card edge | "Back to my turn" past card edge |
| 375x667 | 375×294 @159 | 311×224 @158 ✗ | 375×294 @159 | 375×294 @159 | ✅ yes | same | fully visible | fully visible |
| 360x740 | 360×334 @175 | 360×296 @159 ✗ | 360×334 @175 | 360×334 @175 | ✅ yes | same | "Back to my turn" past card edge | "Back to my turn" past card edge |
| 390x844 | 390×368 @210 | 390×368 @175 ✗ | 390×368 @210 | 390×368 @210 | ✅ yes | same | fully visible | fully visible |
| 768x1024 | 720×504 @232 | 720×504 @197 ✗ | 720×504 @232 | 720×504 @232 | ✅ yes | same | fully visible | fully visible |
| 667x375 | 411×310 @65 | 411×310 @65 | 411×310 @65 | 411×310 @65 | ✅ yes | same | card cut off at bottom; rail scrolls 88px; "Back to my turn" past card edge | rail scrolls 20px; "Back to my turn" past card edge |
| 720x360 | 397×296 @64 | 397×296 @64 | 397×296 @64 | 397×296 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 83px; "Back to my turn" past card edge; button covered/offscreen | rail scrolls 15px; "Back to my turn" past card edge |
| 740x360 | 394×296 @64 | 394×296 @64 | 394×296 @64 | 394×296 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 83px; "Back to my turn" past card edge; button covered/offscreen | rail scrolls 15px; "Back to my turn" past card edge |
| 844x390 | 428×326 @64 | 428×326 @64 | 428×326 @64 | 428×326 @64 | ✅ yes | same | card cut off at bottom; rail scrolls 53px; "Back to my turn" past card edge | "Back to my turn" past card edge |
| 932x430 | 476×366 @64 | 476×366 @64 | 476×366 @64 | 476×366 @64 | ✅ yes | same | rail scrolls 13px; "Back to my turn" past card edge | "Back to my turn" past card edge |

## Summary

- New head, board identical closed/open: 46/46 runs (main 20/46)
- New closed board vs main closed: bigger none; same 46; smaller none
