# PR #389 evidence at f27edf7

Preview (commit-pinned): https://backgammon-mastermind-gkyne1y2c-softwarebyzes-projects.vercel.app

Captured with Playwright: iPhone 13 Pro Max (WebKit, 428x926 @3x), iPhone SE landscape (WebKit, 667x375 @2x),
iPad Pro 11 (WebKit, 1024x1366 @2x), desktop (Chromium, 1440x900). Positions come from `share-urls.txt`.

- `portrait-tray-1-7-14-15.png`: the tray at 1, 7 and 14 off, and the end-of-game state (White 15 off, Black 1 off).
- `portrait-full.png`: full screens for the end of the game and for 7 off.
- `owned-cube-bar.png`: an owned cube at its owner's end of the bar with 4 checkers on the bar for each side, portrait and 667x375.
- `landscape.png`, `ipad.png`, `desktop.png`: 1/7/14 off and an owned cube.
- `rtl-and-editor.png`: Arabic (RTL), and the position editor with White owning the cube.
- `animation.png`: frames from a 25 fps recording of bearing off the 15th checker. It lands on the newest slot.
- `board-size.md`: board rect on the PR versus production for every view. All are identical.
- Tray accessibility label: "Bear off. White: 7 off. Black: 7 off". In Arabic: "إخراج الحجر. الأبيض: 7 خارج. الأسود: 7 خارج".
