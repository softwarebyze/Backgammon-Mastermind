# Positions

Open **Set up a position** from Home, or **Positions** in Settings. This screen
is available in production on web, iOS and Android; the developer loader stays
available for QA.

- Start from the standard board or an empty board (**Standard setup** and the
  trash **Clear board** button above the board). There is no "copy the current
  game" action any more: save a live board from the game itself instead (below).
- Choose White or Black above the board. Press a point and drag toward the
  centre to increase its stack, or toward the edge to decrease it. The initial
  press sets the stack size from the checker slot touched (nearest the outer
  edge means one checker). A blocked addition gives one light haptic per stroke
  and an accessible message when that colour has no checkers left. The stroke
  stays on its starting point even when the pointer crosses another point;
  cancellation restores the starting position.
- Tap or drag directly on the bar for the selected colour. Stacks support up to
  15 checkers, limited by the available off-tray checkers. Painting over the
  other colour returns that stack to its own tray. Each player always has 15
  checkers across the board, bar and off tray.
- **Undo / redo** sit in the header. A whole drag is one step; so is each tap,
  stepper press, preset, import or saved position opened.
- The single doubling cube lives **on the board**, in the bar: centred on the
  hinge, or slid into the owner's half (Black above, White below). Tap it to
  edit value and owner.
- Import XGID, GNU Position ID with optional Match ID, labeled GNU clipboard
  text, legacy developer position JSON, or a shared position link.
- Export XGID, GNUID or versioned JSON; use Copy or Share link.
- Save up to 50 positions locally, each with a name, an optional note and the
  time it was saved. Saving the same position again replaces the older entry
  and moves it to the front. These bookmarks do not sync between devices.

### Saving from a game

The game header has a bookmark button. It opens a small dialog for a name and
an optional note, then saves the live board to Saved positions marked
"From a game". The game is never paused, left or replaced. A game snapshot
taken after spending any dice starts with a fresh roll, to avoid reusing spent
dice.

Opening, editing, importing, saving or sharing a position never replaces the
active game. Play from here uses the existing replacement confirmation. A bad
shared link displays an error with a way to start a new setup; it never starts
an unrelated default game. Recipients can open shared links in a browser
without installing the app. Web shares stay on the current origin (including
PR previews); native shares use the production website. Native custom-scheme
links can also open the position route.

## Interface direction

The incumbent board, brown/orange palette and Inter remain the visual authority.

The page has four fixed parts and **nothing moves the board**:

1. Toolbar: White/Black paint selector, Standard setup, Clear board.
2. The board, with the cube in the bar.
3. **The strip**: a card of reserved height directly under the board. It shows
   what is selected and swaps its content in place:
   - nothing selected: a one-line hint plus three tiles (who is on roll, the
     dice, the score). Tapping the turn tile switches sides; the others open
     their editors;
   - a point or the bar: its exact count as a − n + stepper, Clear point, and
     how many checkers that colour has left;
   - the cube: value stepper, Reset, and a Centered / Black / White segment;
   - the dice: one row of six faces per die, plus Roll later;
   - the score: Match to stepper (0 = Money) with Crawford, then both scores
     as steppers; in money play the scores give way to Jacoby / Beavers.
   Every editor closes with the orange check. Nothing overlays the board and
   no band is inserted above or below it.
4. Import / share, Saved and Play. Their panels open below everything else.

Scores, match length and cube value use steppers rather than number pads, so
there is no iOS keyboard Done bar to manage. Controls expose selected/expanded
states and accessible labels. Android targets are at least 48dp, iOS at least
44pt.

## Format and play boundaries

The position document preserves cube, cube owner, scores, match length,
Crawford/Jacoby flags, pending offers and source-specific context. The current
game engine supports checker play only. Starting play from a position does not
apply cube or match scoring; the screen explains this before Play. Full-turn rolls can be replayed from a game snapshot.

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
direct stack dragging in both colours, the strip's count/cube/dice/score
steppers, undo/redo, save/relaunch/reopen, saving from a game with a note,
GNU import, XG export/copy, starting play, and malformed shared links. It is registered in the Android evidence run.

`.maestro/app/position-preview-ios.yaml` runs alongside the smoke flow on
iPhone and iPad. It captures standard and empty boards, opens a shared position
through the first-use iOS confirmation, and checks the imported dice before
capturing the shared preview. Flow results and captures are attached to CI runs.

### Cube and dice visual compatibility

Unset dice use the same solid player-coloured face as rolled dice with a
question mark; this applies to the game opening tray too. The cube uses the
ivory face, centered 64 convention, ownership and Crawford dimming from
`feat/272-match-cube` (PR #325). `DoublingCubeFace` is a presentation-only
primitive for sharing that treatment when the branches combine. This branch
does not change the match engine or remove the existing checker-play
limitation.

### Stack ownership

An occupied point keeps its checker colour while its count changes, regardless
of the paint selector. After it reaches zero, additions use the selected colour.
A drag crossing zero uses an empty base so reversing it cannot resurrect the old
colour; cancelling restores the original position and both checker pools. The
strip's stepper and screen-reader adjustments follow the same rule.

Occupied bar stacks follow the touched half's owner too. Crossing zero transfers
subsequent additions to the selected colour's bar without losing checkers already
there; the gesture keeps its original direction and cancellation restores both bars.
