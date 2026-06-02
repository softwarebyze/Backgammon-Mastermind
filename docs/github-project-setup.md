# GitHub Project Setup

Use this to track the roadmap in GitHub Projects (v2).

## 1. Create the project

```bash
gh project create --owner @me --title "Backgammon Mastermind" --format board
```

Or: GitHub → **Projects** → **New project** → Board template.

## 2. Columns

| Column | Meaning |
|--------|---------|
| Backlog | From `docs/roadmap.md` M2–M6 |
| Ready | Spec’d, no blockers |
| In Progress | Active PR branch |
| In Review | PR open |
| Done | Merged |

## 3. Labels (create once)

```bash
for label in milestone-0 milestone-1 milestone-2 milestone-3 milestone-4 milestone-5 milestone-6 ux learn ci perf growth; do
  gh label create "$label" --color "0E8A16" 2>/dev/null || true
done
```

## 4. Bulk-create Milestone 1 issues

```bash
gh issue create --title "M1: Game replay & move history" --label milestone-1
gh issue create --title "M1: Screenshot CI (iPad, web, landscape)" --label milestone-1,ci
gh issue create --title "M2: Learn module — board setup + horseshoe quiz" --label milestone-2,learn
gh issue create --title "M2: Puzzles — find the best move" --label milestone-2,learn
gh issue create --title "M3: Post-game blunder summary" --label milestone-3
gh issue create --title "M3: Statistics dashboard" --label milestone-3
gh issue create --title "M4: Remotion launch videos in CI" --label milestone-4,ci
gh issue create --title "M4: Shareable puzzle-of-the-day" --label milestone-4,growth
gh issue create --title "M5: Board photo setup (Vision + BackgammonCV)" --label milestone-5
gh issue create --title "M0: Bundle size delta on every PR" --label milestone-0,ci
gh issue create --title "M0: PostHog analytics" --label milestone-0
```

## 5. Link PRs

In each PR description: `Closes #NN` and milestone label.

## 6. Release ritual

1. All `milestone-N` issues in **Done**
2. `pnpm check-all` + Maestro smoke (+ screenshot diff when added)
3. EAS build or Update
4. Attach Maestro recording + Remotion clip to release notes
