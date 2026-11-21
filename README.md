# QA evidence for PR #389 @ 9e36ee4

Preview (confirmed Vercel deployment for `9e36ee41851c0c6cd6025d095bef78294c1f2dbe`):
https://backgammon-mastermind-1pxvx4vzs-softwarebyzes-projects.vercel.app

Playwright Chromium (WebKit was not installed in this environment) with iPhone 16 Pro, iPad Pro 11, and 1440×900 desktop viewports. PostHog hosts route-aborted.

## Board and tray size vs production

Identical at every viewport measured (tolerance 0.6 px):

| Viewport | Board | Tray |
|---|---|---|
| 402×874 | 402×418 | 32×374 |
| 852×393 | 537×392 | 32×348 |
| 874×402 | 551×402 | 32×358 |
| 820×1180 | 720×504 | 32×460 |
| 1032×1376 | 768×728 | 48×684 |
| 1180×820 | 812×708 | 48×664 |
| 1376×1032 | 1000×728 | 48×684 |
| 1440×900 | 1000×728 | 48×684 |

The four baseline sizes also match the Nov 13 production baseline in `/workspace/qa-clips/bearoff-baseline/`.

## Layout

- 1 / 7 / 15 off on each side, all four phone/tablet orientations plus desktop: thin uniform slabs in groups of five, stacked from the outer edge, no `+N`.
- iPhone landscape 874×402 at 15 off uses 3 px slabs. At 3× DPR they stay readable and countable: cream/navy fill, tan or dark separators, and the gaps between fives are distinct. See `after-iphone-landscape-w15-b15-tray.png` (3× DPR crop) and `iphone-landscape-w15-white-zoom8x.png`.
- Empty tray: dashed outline the size of one group of five at the outer edge.
- Centered and owned cubes: the visible cube face stays clear of the stacks. The tilted cube's axis-aligned bounding box can overlap the nearest slab by 2–6 CSS px in the editor; that is not visible coverage. Live games with a white- or black-owned cube were clear even by the bounding box.
- Tap and drag bear-off both went 7→8 with a visible `checker-flight` and landed as a 5+3 stack from the outer edge.
- RTL Hebrew: chrome mirrors (`dir=rtl`, `lang=he`); both 7-off stacks are 5+2 slabs. Learn → Bearing off (12 off as 5+5+2) and Pip count (5 off) use the new slabs, no `+N`.
- Colours: cream `#F2EAD3` with tan `#B09468` separator; navy `#30305A` with blue `#5050A0` rim.

## Suggested check

Open the `w7-b7` link in `share-urls.txt` on an iPhone and confirm the 7 borne-off checkers on each side look like clean, thin slabs (5 + 2) rather than discs or a squished pile.
