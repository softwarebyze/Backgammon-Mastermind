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

## Option D (after Zack's feedback: B's slimness and count, a softer version of A's 3D look, no empty slots)

- `compare-D.png`: B | A | D1 | D2 at 1, 7 and 15 off, same scale. `closeup-D.png`: 7 off, the tray at 3x enlarged 2x.
- `option-D1.png`, `option-D2.png`: 1, 7, 15 off, Zack's end-of-game state, and a cube White owns at 2, all at 3x.
- Thickness: `min(9, round(token × 0.42))` = 9 px at 428x926 (token 21). B is 8, A is 11.
- D1: even 2 px gaps (1 px if a piece drops below 7 px). 15 pieces = 163 px of the 164 px available, so the half fills to the count label.
- D2: a 4 px gap after every five, pieces touching inside a group. 15 pieces = 143 px.
- Shading: horizontal gradient using the flat slab colour for the body (0.3 to 0.7). The ends (0 and 1) go 50% from the slab fill toward the checker shadow, and the centre (0.5) 50% toward the checker highlight.
  White: ends #D6C5A2, body #F2EAD3, centre #F8F2E1. Black: ends #1D1D37, body #30305A, centre #3D3D61.
  Corner radius 2 px (A uses 3). 1 px rim: black #5050A0 at 0.8 opacity, white #B09468 at 0.6. Top highlight line: white 1 px at 0.35 opacity on White, 0.10 on Black (A uses 0.6 and 0.18).
- Count: 10 px bold #E8D9B8 in a 12 px band right after the newest piece, so it moves with the stack.
- Board is 428x448 and the tray 32x404 in every capture.
