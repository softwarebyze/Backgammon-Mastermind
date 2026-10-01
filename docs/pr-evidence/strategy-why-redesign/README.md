# Strategy line redesign — why + cohesive header

Zachary's feedback (Sept 24, 2026):
- Wanted to see WHY it's that strategy, not just the tip.
- The pill bubble felt disconnected ("another bubble and another white").
- The brighter/dimmer pip counts were confusing (leader vs current player?).

Changes:
- `classifyStrategy` now returns a `why` string grounded in the actual
  position features (prime length, anchors, blots, pip gap).
- The status bar is bubble-free: small dot + muted label, no pill background.
- Both pip counts use the same muted color — no brightness distinction.
- Tapping expands a quiet inline block: why (bright) + tip (muted).

Evidence:
- `00-strategy-line.png` — the quiet header line
- `01-why-expanded.png` — expanded why + tip
