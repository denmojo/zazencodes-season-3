---
name: kanban-cli
description: >
  Use this skill whenever the user wants to interact with the Kanban board via
  the CLI - listing or creating projects, viewing a board, managing columns, or
  managing cards (create, update, move, delete). Trigger on any request like
  "show me the board", "add a card", "move that task", "create a project",
  "what's in my backlog", "rename the column", or any other Kanban management
  request, even if the user doesn't say "CLI" explicitly. Always use this skill
  instead of calling the API directly with curl.
---

# Kanban CLI Skill

The `kanban` command is globally linked and talks to the API at `http://localhost:3001`
(override with `KANBAN_API_URL`). The server must be running - if commands fail
with a connection error, remind the user to run `npm run dev -w server`.

## ID Lookup Pattern

Most commands need IDs (project, column, card). Always resolve them before acting:

```bash
# Step 1 - list projects to get a project ID
kanban projects list

# Step 2 - show board to get column/card IDs (shown truncated in [brackets])
kanban board <projectId>

# For full IDs of columns or cards, fetch the board JSON directly:
curl -s http://localhost:3001/api/projects/<projectId>/board | python3 -c \
  "import sys,json; b=json.load(sys.stdin); [print(c['title'], c['id']) for c in b['columns']]"
```

When the user refers to something by name ("the In Progress column", "the CI task"),
look it up - don't ask them to paste an ID.

## Commands

### Projects
```bash
kanban projects list                       # active only (default)
kanban projects list --all                 # active + completed
kanban projects list --completed           # completed only
kanban projects create "<name>"
kanban projects rename <projectId> "<new name>"
kanban projects delete <projectId>
kanban projects complete <projectId>       # mark completed (flag only)
kanban projects reopen <projectId>         # clear completed flag
```

**Completion semantics:** `complete` only flips a flag on the project. Card columns are **preserved** - cards still in `To Do` or `In Progress` on a completed project represent **deferred** work, not done work. Never auto-move cards to `Done` as part of completion. If the user wants cards moved, that's a separate explicit step.

### Board (visual overview)
```bash
kanban board <projectId>
```
Shows all columns side-by-side with cards. Card IDs are shown truncated - use
the curl pattern above when you need a full ID.

### Columns
```bash
kanban columns create <projectId> "<title>"
kanban columns rename <projectId> <columnId> "<new title>"
kanban columns delete <projectId> <columnId>   # also deletes all cards in the column
```

### Cards
```bash
kanban cards create <projectId> <columnId> "<title>" ["<description>"]
kanban cards update <projectId> <cardId> --title/-t "<t>" --description/-d "<d>" --column/-c <columnId> --order/-o <n>
kanban cards move   <projectId> <cardId> <columnId>   # shorthand for changing column
kanban cards delete <projectId> <cardId>
kanban cards history <projectId> <cardId>             # event log for one card
```

### History (chronology)
```bash
kanban history <projectId>                                   # all events, newest first
kanban history <projectId> -n 20                             # limit
kanban history <projectId> -t card.moved                     # filter by type (comma-sep)
kanban history <projectId> -s 2026-05-28T00:00:00Z           # only since timestamp
kanban history <projectId> -c <cardId>                       # filter to one card
```

Events are append-only and survive card deletion. Completing a project archives its events to `server/data/archive/<projectId>.json` to keep the hot `db.json` small; history queries still merge live + archived so completed-project chronology stays viewable. Reopen leaves the archive in place; deleting a project also deletes its archive file. Types: `card.created`, `card.moved`, `card.renamed`, `card.description_changed`, `card.deleted`, `column.{created,renamed,deleted}`, `project.{created,renamed,completed,reopened,deleted}`. Cards also carry `createdAt` / `updatedAt` for the "when was this last touched?" query.

## Common Workflows

**Add a card to a named column:**
```bash
# 1. Get project ID
kanban projects list
# 2. Get full column ID by name
curl -s http://localhost:3001/api/projects/<projectId>/board | python3 -c \
  "import sys,json; b=json.load(sys.stdin); print(next(c['id'] for c in b['columns'] if c['title']=='In Progress'))"
# 3. Create the card
kanban cards create <projectId> <columnId> "My task" "Optional description"
```

**Move a card by name:**
```bash
# Get full card ID
curl -s http://localhost:3001/api/projects/<projectId>/board | python3 -c \
  "import sys,json; b=json.load(sys.stdin); print(next(c['id'] for c in b['cards'] if c['title']=='My task'))"
# Move it
kanban cards move <projectId> <cardId> <targetColumnId>
```

**After any mutation, show the updated board** so the user can see the result:
```bash
kanban board <projectId>
```

## Tips

- Card IDs in `kanban board` output are truncated to 8 chars - use the curl/python3
  pattern to get the full UUID when needed for update/move/delete.
- `cards update` accepts any combination of flags; omit flags you don't want to change.
- `columns delete` cascades - all cards inside are permanently removed.
- If there's only one project, skip the listing step and use its ID directly.
