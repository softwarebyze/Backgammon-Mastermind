# "Show my move" + blunder meter — visual evidence (Sept 24, 2026)

Real Chromium at 390×844 against Expo web (`bgsage/demo-ci`), driven through the
real guidance modal UI. A temporary QA-only patch opened a realistic demo blunder
session (loss 0.22, 5th of 12, my 13/11·13/10 vs best 8/5·6/5); the patch was
reverted before commit — no QA scaffolding is in the tree.

- `01-question-with-meter.png` — blunder question with the new severity meter:
  needle in the red "Big blunder" band, GNU Backgammon source caption.
- `02-mine-only.png` — "Show my move": player's path only, best move hidden.
- `03-solution-both.png` — "Show the best move": both paths, toggle chips.
- `04-solution-details.png` — expanded candidate table.
- `05-back-to-question.png` — "Back to question" restores the unspoiled question.
- `s11-show-mine-meter.mp4` — H.264, 390×844, 10s: question → Show my move →
  Show the best move → Back → Keep my move.

Related: `~/workspace/bmm-qa/s11_show_mine_meter.py` (Playwright scenario).
