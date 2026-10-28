# Positions

Open **Set up a position** from Home, or **Positions** in Settings. This screen
is available in production on web, iOS and Android; the developer loader stays
available for QA.

- Start from the standard board, an empty board, or the current game.
- Choose White or Black above the board. Press a point and drag toward the
  centre to increase its stack, or toward the edge to decrease it. The initial
  press sets the stack size from the checker slot touched (nearest the outer
  edge means one checker). A blocked addition gives one light haptic per stroke
  and an accessible message when that colour has no checkers left. The stroke stays on its starting point even when the pointer
  crosses another point; cancellation restores the starting position.
- Tap or drag directly on the bar for the selected colour; no separate bar
  menu is needed. Exact count controls operate on the selected board point or bar. Stacks support
  up to 15 checkers, limited by the available off-tray checkers. Painting over
  the other colour returns that stack to its own tray. Each player always has
  15 checkers across the board, bar and off tray.
- Selecting a point or bar shows minus / clear / plus controls beside that
  stack: above the board for top points, below for bottom points. The reserved
  space keeps the board still during a stroke. Screen readers can also adjust
  points and the bar directly.
- Standard setup and Clear board stay visible above the board. The standard
  preset uses a text label without an icon. Current-game capture is in Exchange.
- Both dice stay visible beside the colour selector. Tap either die and choose
  a face from 1 to 6; clearing dice is visible beside the player-on-roll controls.
- Set the player on roll and two dice, or leave both dice at zero to roll later.
- Import XGID, GNU Position ID with optional Match ID, labeled GNU clipboard
  text, legacy developer position JSON, or a shared position link.
- Export XGID, GNUID or versioned JSON; use Copy or Share link.
- Save up to 50 positions locally. Saving the same position again renames it
  and moves it to the front. These bookmarks do not sync between devices.

Opening, editing, importing, saving or sharing a position never replaces the
active game. Play from here uses the existing replacement confirmation. A bad
shared link displays an error with a way to start a new setup; it never starts
an unrelated default game. Recipients can open shared links in a browser
without installing the app. Web shares stay on the current origin (including
PR previews); native shares use the production website. Native custom-scheme
links can also open the position route.

## Interface direction

The incumbent board, brown/orange palette and Inter remain the visual authority.
The workspace prioritizes the board, persistent Standard setup / Clear board,
and White/Black checker selector with visible editable die faces. Selecting a
point or bar places exact minus / clear / plus controls beside it, clamped to
the board edges. There is no sliders button or hidden preset/dice dropdown.
Play remains the single filled orange action. Exchange and Saved positions
retain icon-led disclosure rows; the cube stays visible as an ivory face with ownership, and opens direct halve/double/reset and owner controls. Match metadata remains secondary.
Controls expose selected/expanded states and accessible labels. Android targets
are at least 48dp, iOS at least 44pt. Palette, board assets and Inter stay intact.

## Format and play boundaries

The position document preserves cube, cube owner, scores, match length,
Crawford/Jacoby flags, pending offers and source-specific context. The current
game engine supports checker play only. Starting play from a position does not
apply cube or match scoring; the screen explains this before Play. A game
snapshot taken after spending any dice starts with a fresh roll, to avoid
reusing spent dice. Full-turn rolls can be replayed from the snapshot.

XGID and GNUID encode positions, not move histories. Full match files such as
`.mat` and `.sgf`, replay-video sharing (#98), and multiple active games (#73)
are outside this feature. If a target format cannot preserve source-specific
context (for example XG's cube limit/beavers or GNU's resignation state),
export reports the limitation and offers JSON/link sharing instead.

The GNU Jacoby bit is preserved even in match play, where the rule has no
meaning; XG's match field has only a Crawford flag. That ignored GNU flag
cannot travel through an XGID, but does travel through JSON and shared links.

Versioned share payloads are validated locally. No backend, remote fetch, or
account is required. URLs contain the full position, so anyone with a link can
read it. Names of local bookmarks are not included in shared payloads.

New copy has translation keys in all bundled locales, initially with English
fallback copy. Existing game and board terminology continues using its
existing translations.

## Specifications and verification

The codecs are implemented independently from the published format descriptions:

- [GNU position and match ID technical descriptions](https://www.gnu.org/software/gnubg/manual/gnubg.html)
- [eXtreme Gammon 2 Help: XGID](https://www.extremegammon.com/extremegammon2.pdf)
- The current GNU Match ID extension uses bit 66 as **not** Jacoby; unknown
  reserved bits are rejected rather than silently dropped.

Unit tests include the published starting-position/Match ID and XG help
examples, asymmetric external positions, player perspective, bar/off counts,
round trips, malformed inputs, saved-board recovery, and active-game isolation.
`.maestro/app/position-setup.yaml` exercises the production entry point, exact
direct stack dragging in both colours, precise count controls, save/relaunch/reopen, GNU import, XG export/copy, starting play,
and malformed shared links. It is registered in the Android evidence run.

`.maestro/app/position-preview-ios.yaml` runs alongside the smoke flow on
iPhone and iPad. It captures standard and empty boards, opens a shared position
through the first-use iOS confirmation, and checks the imported dice before
capturing the shared preview. Flow results and captures are attached to CI runs.

### Cube and dice visual compatibility

The standard preset uses a text label without an icon. Unset dice use the same
solid player-coloured face as rolled dice with a question mark; this applies to
the game opening tray too. No dashed die borders remain. The position cube uses
the ivory face, centered 64 convention, ownership and Crawford dimming from
`feat/272-match-cube` (PR #325). `DoublingCubeFace` is a presentation-only primitive
for sharing that treatment when the branches combine. This branch does not
change the match engine or remove the existing checker-play limitation. The
position document continues preserving full cube and match context for exchange.

### Editable scoreboard

White and Black scores appear as ivory/dark scorecards beside a central match
target, using the scorecard material from PR #325. Each numeral is directly
editable with a numeric keyboard. Zero target is labeled Money game. Match scores
are capped at the target, and shortening the match clamps both scores so the
position remains valid. Changing the target resets incompatible rule flags.
Imported cube context and the opposite player's score survive score edits.
Match rules remain behind the secondary disclosure; scores are always displayed.

### Stack editing and quiet board workspace

An occupied point keeps its checker colour while its count changes, regardless
of the paint selector. After it reaches zero, additions use the selected colour.
A drag crossing zero uses an empty base so reversing it cannot resurrect the old
colour; cancelling restores the original position and both checker pools.
Accessibility adjustments and contextual controls follow the same ownership
rule. The contextual controls are one joined decrement/count-and-clear/increment
strip; no separate point label, ambient off-count summary, or drag instruction
text surrounds the board. Exhaustion gives one light haptic per stroke and a
screen-reader announcement, without adding another visible paragraph.

Occupied bar stacks follow the touched half's owner too. Crossing zero transfers
subsequent additions to the selected colour's bar without losing checkers already
there; the gesture keeps its original direction and cancellation restores both bars.
