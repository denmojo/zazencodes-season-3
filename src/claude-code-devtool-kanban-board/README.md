# Kanban Board

Single-user Kanban board. React + Vite + shadcn/ui frontend, Express + JSON file backend.

## Run

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- API:    http://localhost:3001

## Features

- Columns: create / rename / delete
- Cards:   create / edit / delete
- Drag-and-drop cards between columns
- State persisted to `server/data/db.json`

## CLI

A terminal CLI that talks to the API.

### Install

```bash
npm install
npm run build -w cli
npm link -w cli
```

This links `kanban` as a global command. The server must be running for commands to work.

### Usage

```bash
# Projects
kanban projects list
kanban projects create <name>
kanban projects rename <projectId> <name>
kanban projects delete <projectId>

# Board (visual overview)
kanban board <projectId>

# Columns
kanban columns create <projectId> <title>
kanban columns rename <projectId> <columnId> <title>
kanban columns delete <projectId> <columnId>

# Cards
kanban cards create <projectId> <columnId> <title> [description]
kanban cards update <projectId> <cardId> [--title/-t] [--description/-d] [--column/-c] [--order/-o]
kanban cards move <projectId> <cardId> <columnId>
kanban cards delete <projectId> <cardId>
```

Set `KANBAN_API_URL` to target a non-default server (default: `http://localhost:3001`).

### Rebuild after changes

```bash
npm run build -w cli
```

### Uninstall

```bash
npm unlink -g kanban-cli
```

## Claude Code hooks (optional)

This project ships a `.claude/settings.json.example` with two PostToolUse hooks:

- Auto-sync `.claude/skills/kanban-cli/SKILL.md` to `~/.claude/skills/kanban-cli/SKILL.md` on edit.
- Auto-rebuild the CLI (`npm run build -w cli`) when any file under `cli/src/` is edited.

The auto-rebuild hook needs an absolute path to your checkout, which makes it non-portable, so the active `.claude/settings.json` is gitignored. To enable the hooks locally:

```bash
cp .claude/settings.json.example .claude/settings.json
# then edit the `cd /Users/.../claude-code-devtool-kanban-board` path inside
# settings.json to match your checkout, e.g. on macOS:
#   cd /Users/<you>/<path-to>/zazencodes-season-3/src/claude-code-devtool-kanban-board
```

`settings.json` is gitignored so your local path never gets committed.
