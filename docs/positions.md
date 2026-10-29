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
  stack: above the board for top points, below for bottom points. The controls appear after release, so adding their row cannot move the
  board under an active finger; empty control bands take no space. Screen readers can also adjust
  points and the bar directly.
- Standard setup and Clear board stay visible above the board. The standard
  preset uses a text label without an icon. Current-game capture is in Exchange.
- Both dice stay visible in the compact strip immediately below the board. Tap either die and choose
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
use compact toolbar actions. The cube stays visible as an ivory face with an owner checker, and opens direct halve/double/reset and owner controls. Match metadata remains secondary.
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
target, using the scorecard material from PR #325. A compact two-colour score summary stays visible beside the dice and cube.
Tapping it opens the scorecards and match target; each numeral is editable with a numeric keyboard. Zero target is labeled Money game. Match scores
are capped at the target, and shortening the match clamps both scores so the
position remains valid. Changing the target resets incompatible rule flags.
Imported cube context and the opposite player's score survive score edits.
Match rules live in that same focused editor; scores are always displayed in the summary.

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

The iOS score number pad uses React Native’s built-in Done toolbar, with its localized button label and no custom accessory ID. Dismissing it
keeps the entered values; dragging the workspace can also dismiss the keyboard.
The native flow explicitly presses Done rather than relying on a Return key that
the number pad does not provide.

### Compact object workspace (XG reference revision)

The arrival view is a single working area: checker colour and always-visible
Standard setup / Clear board above the board, then a compact strip containing
the player on roll, both dice, doubling cube/owner, and two-colour score summary.
Tapping an object reveals only that object's editor below the strip. Close returns to the board
without keeping the form open; it closes without discarding edits. No permanent turn form, full-width cube row,
score form, rule disclosure, or empty stack-control bands occupy the idle view.

Import/share, Saved, and Play share the next compact row. Play opens the mode
choice and checker-play limitations before the actual start action and existing
active-game replacement confirmation. Exchange drafts survive closing/reopening
the tool. The position editor remains a scrolling, responsive native workspace;
long translations and large text can wrap rather than shrink touch targets.

### Great-experience redesign (follow-up)

- **No layout jumps.** Stack controls float over the board (top edge for top
  points and bars, bottom edge for bottom points and bars), clamped to the
  board edges, so selecting, deselecting, or finishing a drag never moves the
  board in flow. Cube, score, turn, and dice editors float over the tools
  below the object dock instead of expanding the page, so opening or closing
  one never changes page height or scroll position; long editor content
  scrolls inside the overlay.
- **Saved names clear.** Saving a position clears the name input; loading a
  saved entry still fills it with that entry's name.
- **Save from a game.** The game header has a bookmark button (computer and
  pass-and-play alike) that saves the live board as a "Game snapshot" and
  shows a brief confirmation pill, without leaving or replacing the game.
  The snapshot can be renamed later in the Saved panel. Live `GameState`
  carries no cube, match, or score fields, so a game snapshot preserves
  checker and (unspent) dice state only — cube/match context remains
  editor-only, and this is stated in the PR body rather than implied.
- **Copy from current game.** The exchange action is now labelled "Copy from
  current game" with a hint that it copies the active game into the editor
  and leaves the game untouched. With no active game it stays visible but
  disabled, with an explanation, instead of disappearing.
- **Crawford, explained.** A dimmed cube shows a visible "Crawford" badge on
  the dock (the dimming itself is intentional and unchanged). The cube editor
  explains the dimming and offers "Turn Crawford off" directly; the Score
  editor toggle still works.
- **Mobile, desktop, and font size.** The workspace keeps the existing
  ~920px content cap on desktop and fits ~320px phones by wrapping dock,
  toolbar, dice-picker, and scoreboard rows instead of clipping them. Fixed
  heights that clipped enlarged text are now minimums (stack strip, score
  cards and inputs, object buttons), so containers grow with larger text
  while touch targets stay at least 44pt on iOS and 48dp on Android. Text
  is never truncated to fit. Large-text behaviour is visual-only: it is not
  covered by Jest, which cannot render system font scaling, and still needs
  physical-device visual QA.
