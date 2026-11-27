# PR #389 at 4f28556: owned cube back in its owner's corner

Preview: https://backgammon-mastermind-qo4868xvu-softwarebyzes-projects.vercel.app

## Why main reserved the corner
Before D1 (9e36ee4 and main), an owned cube sat in its owner's outer tray corner at `cubeCenterY`. Every stack started at `BEAR_OFF_PADDING + cubeCornerClearance` (36 px) in **both** halves, so the cube never covered a checker. It also meant a corner stayed empty when nobody owned the cube, and that was the "floating stack" Zack disliked.

## What 4f28556 does
- An unowned cube stays centred on the hinge. An owned cube, or the cube during an offer (shown with the taker), sits in its owner's outer corner, as on main and in XG.
- A stack starts flush at 4 px unless its player's cube is in that corner. Then it starts just past the cube (4 + 28 + 2 = 34 px on phones), and the hinge reserve is dropped for that half because the cube is not there.
- D1 is otherwise unchanged: shaded pieces, even gaps, the count, no ghost slots, the same board and cube size. The bar change from f27edf7 is reverted.

## The fit problem (iPhone portrait only)
On a 428×926 phone each half is 196 px. 15 pieces at 9 px with 2 px gaps need 163 px. Add the count (12 px), the cube (28 + 2 px) and 4 px padding at each end, and you need 213 px, so it misses by 17 px. No layout keeps 9/2 there with the cube in the corner:
- **D1 unchanged** (flush under the cube): the cube covers 3 pieces (`options-portrait.png`, panels 1–2).
- **Shipped:** only the owner's half, and only while that player owns the cube, uses the thickest pieces that fit, which is 7 px with 2 px gaps. The other half keeps 9 px. The catch is that the owner's pieces get thinner (9 → 7 px) when they take the cube.
- **Alternative, 7 px everywhere:** one thickness on phones, so nothing changes size when the cube moves, but every stack is thinner than D1 (panels 5–7).

Landscape 667×375 (6 px), iPad and desktop (9 px) fit 15 with the cube in either place, so nothing changes size there. The position editor goes from 7 to 6 px in the owner's half.

## Checks
`collisions.md`: the cube overlaps 0 pieces and 0 counts in every case, including portrait, 667×375, iPad, desktop, RTL and the editor. The board rects match production: 428×448, 379×374, 768×728, 1000×728, and the editor at 396×410.
