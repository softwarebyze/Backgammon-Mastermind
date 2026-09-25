[00:09:33.587] throttling /bgsage/* by 2.5s each (cold-engine race)
[00:09:33.589] loading app
[00:09:36.909] tapped real vs-computer button
[00:09:36.954] tutor mode ON, fast computer ON
[00:09:39.684] opening resolved: {"phase":"moving","cp":"white","dice":[4,2],"rem":[4,2],"anim":false}
[00:09:39.692] --- TURN 1 (human): cold-engine race, fast heuristic turn ---
[00:09:39.695] turn 1 dice (real roll): [4,2]
[00:09:41.080] turn ended 1385ms after turn start; end state: black/moving, dice left: 2
[00:09:41.603] OBSERVED hold: "Sage is reviewing your turn…" at +522ms
[00:09:44.753] OBSERVED modal opened at +3672ms
[00:09:48.761] hold: verdict pending (the reported race): game FROZEN — computer never moved
[00:09:48.761] delayed verdict -> BLUNDER modal opened after the hold (the exact bug scenario, now fixed)
[00:09:52.826] modal open after hold: game FROZEN — computer never moved
[00:09:52.871] clicked "Keep my move"
[00:09:52.874] WASM now warm; unthrottled from here
[00:09:54.517] game continued after turn 1 (computer played through)
[00:09:54.517] --- TURN 2 (human): forced blunder -> Keep my move ---
[00:09:54.523] turn 2 blunder: engine loss=0.394 (reachable=10, matched=10)
[00:09:56.016] OBSERVED modal opened at +7ms
[00:10:00.118] modal open (turn 2): game FROZEN — computer never moved
[00:10:00.171] clicked "Keep my move"
[00:10:02.099] computer completed its turn after keep-my-move
[00:10:02.099] --- TURN 3 (human): forced blunder -> Hint ---
[00:10:02.104] turn 3 blunder: engine loss=0.117
[00:10:03.637] OBSERVED modal opened at +10ms
[00:10:03.779] clicked "Hint"
[00:10:04.980] hint: EXACT turn-start board restored + suggestion arrows drawn
[00:10:21.536] clean turn (engine-best): SILENT — correct
[00:10:22.160] --- TURN 4 (human): forced blunder -> Take back ---
[00:10:22.174] turn 4 blunder: engine loss=0.455
[00:10:24.015] OBSERVED modal opened at +6ms
[00:10:24.294] clicked "Take back"
[00:10:25.097] take-back: EXACT turn-start board restored, full dice back
[00:10:41.675] post-take-back clean turn: silent
[00:10:42.286] --- TURN 5 (human): forced blunder -> Turn Tutor off ---
[00:10:44.166] OBSERVED modal opened at +10ms
[00:10:44.418] clicked "Turn Tutor off"
[00:10:45.223] tutorMode persisted as false; modal closed
[00:10:46.284] --- TURN 6 (human, tutor OFF): blunder must stay silent ---
[00:10:59.723] tutor OFF: turn stayed silent — correct
[00:10:59.771] ALL CHECKS PASSED