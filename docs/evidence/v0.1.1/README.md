# v0.1.1 fix evidence (TestFlight release blockers)

Reproduced on **Expo web** comparing **main** (`localhost:8082`) vs **fix stack** (`localhost:8081`).

| Fix | Issue | Before | After |
|-----|-------|--------|-------|
| Resume | [#25](https://github.com/softwarebyze/Backgammon-Mastermind/issues/25) | [shown but no-op after game over](./25-resume/before/) | [hidden after game over](./25-resume/after/) |
| Cold launch | [#26](https://github.com/softwarebyze/Backgammon-Mastermind/issues/26) | [stuck Loading…](./26-cold-launch/before/) | [board restored](./26-cold-launch/after/) |
| Back nav | [#28](https://github.com/softwarebyze/Backgammon-Mastermind/issues/28) | [roll wiped on new game](./28-back-nav/before/) | [Resume keeps roll](./28-back-nav/after/) |
| Opening roll | [#30](https://github.com/softwarebyze/Backgammon-Mastermind/issues/30) | [4 dice doubles at start](./30-opening-roll/before/) | [one die each → two dice](./30-opening-roll/after/) |

## How to re-run

```bash
# Terminal 1 — main (before)
cd Backgammon-Mastermind-before && pnpm web -- --port 8082

# Terminal 2 — fix branch (after)
pnpm web -- --port 8081
```

Native TestFlight replay: same flows on device after merging the stack (#34 → #37).
