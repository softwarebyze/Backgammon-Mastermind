# Positions

Open **Set up a position** from Home, or **Positions** in Settings. This screen
is available in production on web, iOS and Android; the developer loader stays
available for QA.

- Start from the standard board, an empty board, or the current game.
- Select a point, then add/remove checkers. Removed checkers return to the
  borne-off tray. Select a bar button to edit that player's bar. Each player
  always has 15 checkers across the board, bar and off tray.
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
point editing, save/relaunch/reopen, GNU import, XG export/copy, starting play,
and malformed shared links. It is registered in the Android evidence run.
