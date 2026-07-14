# GitHub Project setup — Backgammon Mastermind

**Source of truth:** GitHub Issues + this Project board. Markdown docs only point here.

## 1. Create the project (once)

Needs the `project` scope on `gh`:

```bash
gh auth refresh -s project,read:project
gh project create --owner softwarebyze --title "Backgammon Mastermind"
```

Or: GitHub → **Projects** → **New project** → Board → name it **Backgammon Mastermind**.

Link the project to the repo: Project → **…** → **Settings** → **Manage access** / **Link a repository** → `softwarebyze/Backgammon-Mastermind`.

## 2. Columns

| Column | Meaning |
|--------|---------|
| **Now** | Current release ship gate (`release-0.1.4` / [#112](https://github.com/softwarebyze/Backgammon-Mastermind/issues/112)) |
| **Next** | Spec’d for the release after |
| **Later** | Backlog / epics |
| **Done** | Closed / shipped |

Optional: add a **Status** single-select field matching those names if you use the table layout.

## 3. Seed the current release

Add these issues to **Now**:

| Issue | Title |
|-------|--------|
| #112 | Release: v0.1.4 (epic) |
| #92 | Web: options sheet dismiss |
| #94 | Web: board sizing / stacks / header |
| #93 | Dice default to dots |
| #89 | Confetti when winning |
| #75 | Tasteful game audio |

```bash
# After project exists, note its number from `gh project list --owner softwarebyze`
PROJECT_NUMBER=<n>
OWNER=softwarebyze
for issue in 112 92 94 93 89 75; do
  gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "https://github.com/softwarebyze/Backgammon-Mastermind/issues/$issue"
done
```

## 4. Labels

| Label | Use |
|-------|-----|
| `release-0.1.4` | Must ship in v0.1.4 |
| `bug` / `enhancement` / `ux` / `testflight` | Type |
| `release-blocker` | Hard gate (use sparingly) |

Create the next release label when you open the next release issue (`release-0.1.5`, …).

## 5. Ritual

1. Work only from **Now** + `release-*` labels.
2. PRs: `Fixes #N` / `Closes #N`.
3. When the release issue’s checklist is done → version bump → TestFlight / GitHub Release (Remotion assets auto-render).
4. Never duplicate status into `docs/product-backlog.md` or `UX-AUDIT.md`.
