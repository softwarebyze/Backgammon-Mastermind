# Over-the-board game clock

Open **Game clock** from Home or Settings when playing on a physical board.
This standalone tool does not change the clocks or rules of games in the app.

Choose each player's main time and the free delay per turn, then tap the first
player's clock to start. Only the running clock can end a turn. Each handoff
starts the other player's full delay; unused delay is discarded, never added
to their main time. The default is 10 minutes per player with 12 seconds of
simple delay. The 10-, 14-, and 18-minute controls suit 5-, 7-, and 9-point
matches at two minutes per point.

Pause preserves both main time and unused delay. Reset asks for confirmation
and restores both clocks to the chosen starting time. Controls are locked until
reset. Sound can be muted and the upper clock can be rotated toward a player
sitting opposite. The screen stays awake while this screen is open.

Main time continues to elapse if the app goes into the background or you leave
this screen. Returning catches up from the clock's timestamp. Pause before
leaving for a break. Preferences are saved; the live clock lasts for the current
app session and resets if the app process is terminated.

At zero the clock flags the player and stops both clocks. The last ten seconds
show tenths; optional sounds signal handoffs, low time, and timeout. Native
sounds respect the phone's silent mode.

Coverage: `src/features/timer/*.test.ts`, `.maestro/app/game-clock.yaml`.
The Android CI flow publishes ready/running/paused/rotated/expired/reset images
and a recording with the PR's usual Maestro evidence.
