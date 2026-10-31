# Computer difficulty

Settings offers Classic, Easy, Medium, and Hard before or during computer games.
The home screen and turn banner show the selected opponent and a short description.
The preference applies to new and resumed games; missing or invalid older values
resolve to Classic. It is included in setting_changed and pref_computer_level.
Tutor sensitivity stays unchanged and remains a separate follow-up to #275.

Classic preserves the existing synchronous heuristic opponent and remains the
default. The three Sage policies use the existing native/web engine at 1-ply
with the existing 1000 ms budget. They share candidate evaluation, but choose
among ranked candidates with softmax temperatures 0.20 (Easy), 0.06 (Medium),
and 0 (Hard). Hard always chooses the first playable ranked candidate. These
are distinct move-selection policies, not deeper searches or calibrated ratings.
No WASM binary, native budget, model, or dependency changed.

Sage plans a full roll, validates each step against the app rules, and caches only
the exact continuation. A changed level/board invalidates that continuation.
Unavailable analysis or a resumed partial roll uses the existing legal Classic
opponent, with a visible fallback message. Conversion rejects premature bear-off,
uses both dice when possible, and prefers the higher die for single-die bear-off.

## Strength evidence

2026-10-27: adapted the existing #213 benchmark (which extends #132), loaded the
committed WASM with the current board conversion and selection policy, and ran
1,000 games per pairing, seed 275, alternating colors. The temporary harness and
full log are attached to the PR evidence release for reproducibility. The harness
has lookahead removed; every measured Sage side uses 1-ply.

| A vs B | A win rate (approx. 95% interval) | A points/game |
|---|---|---|
| Easy vs Medium | 9.9% ± 1.9 | -1.682 |
| Medium vs Hard | 28.9% ± 2.8 | -0.713 |
| Classic vs Hard | 11.2% ± 2.0 | -1.461 |

No games hit the 2,000-turn cap and no resulting boards mismatched. The old
benchmark takes Classic after an undecodable/incomplete selected turn: 3 such
fallbacks for Medium and 4 for Hard across the run. The app additionally tries
other ranked legal candidates before falling back. Mean 1-ply equity loss per
measured decision was Easy 0.1055, Medium 0.0319, Hard 0, Classic 0.0680.
Desktop WASM evaluation p95 was 0.8 ms; this is not a mobile latency guarantee.
These samples support the ordering among the Sage choices, not Elo claims or
an ordering between Classic and every level. Classic is the familiar default,
not a rung in the Easy/Medium/Hard sequence.

## Verification

Unit tests cover deterministic choices, legal full turns, invalid candidates,
disabled-engine fallback, continuation invalidation, old partial saves,
preference migration/persistence, and analytics. Conversion correctness has a
negative control: removing the recovered fixes fails three recovery tests;
restoring them passes all ten. Native QA used an existing iPhone development
client on a dedicated simulator and Metro 8095: choose levels, restart and check
Hard persists, play a human turn, observe Hard complete a turn without the
fallback banner, and change difficulty during play. Web QA loaded a fixed
black 3-1 turn and returned to White with Hard displayed. The Maestro feature
flow is registered in both .maestro/config.yaml and the Android runner; its CI
result is separate from local manual QA.
