# PR #389 borne-off tray: design mockups (exploration only, not on the PR)

Real app render: web export of `fix/borne-off-stack` @ 9e36ee4 plus `mock.patch`, captured in WebKit at
iPhone 13 Pro Max portrait, 428x926 CSS px, deviceScaleFactor 3. Board size is identical in every option
(board 428x448, tray 32x404). The style is picked at runtime with `localStorage['bgmm.mockBearOff'] = A|B|C`.

- `compare.png`: ours now | A | B | C at 1, 7 and 15 off, with XG Mobile and Galaxy tray crops.
- `option-*.png`: per option at 3x: 1, 7, 15 off, Zack's end-of-game state (White 15, Black 1), and a cube owned by White.
- `raw/*-full.png`: full-screen captures.

| Option | Piece | Thickness | Gaps | Anchor | Count |
|---|---|---|---|---|---|
| now | flat slab, 1px rim | 6px | 4px every 5 | 40px in from outer end (corner cube reserve) | none |
| A | edge-on checker, cylinder shading across width, rounded ends, checker colours | 11px | 4px every 5 | flush to outer end (4px pad) | none |
| B | flat bar, player colour, 1px rim | 8px | 2px between every bar | flush to outer end | number right after the newest bar |
| C | A's piece + faint outline slot for every checker not yet off | 11px | 4px every 5 | flush to outer end | the empty slots show what's left |

At 15 off, A/C fill from the outer end to about 14px short of the centred cube; B leaves room for its label.

Cube: unowned stays centred on the hinge, with the existing small hinge reserve. In A/B/C an owned
cube moves to its owner's end of the centre bar (Galaxy keeps its cube on the bar too; XG keeps it off the
tray), so no tray reserves a corner. Risk: it can overlap bar checkers when 4+ are on the bar.

Mock-only hacks in the patch: `position-play` is enabled on finished positions so 15-off renders on the game screen.
