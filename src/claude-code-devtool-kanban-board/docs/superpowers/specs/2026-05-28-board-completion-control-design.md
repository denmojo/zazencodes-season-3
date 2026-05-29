# Board-view project completion control

**Date:** 2026-05-28
**Card:** Add close/reopen project button to board view

## Goal

Surface project completion controls in the board view itself so a user does not
have to drop to the CLI (or back out to the Projects list) to mark a project
complete or reopen it. The control shows "Complete project" when the project is
active and "Reopen project" when it is completed.

## Why it's small

The backend, CLI, and API client are already done:

- `POST /api/projects/:id/complete` and `/reopen` exist
  (`server/src/routes/projects.ts`) and emit `project.completed` /
  `project.reopened` events. Complete also archives the project's events.
- `api.completeProject(id)` / `api.reopenProject(id)` exist
  (`client/src/lib/api.ts`) and return the updated `Project`.
- The Projects **list** view already exposes per-project complete/reopen ghost
  icon buttons (`client/src/components/Projects.tsx`).

The only gap is the board **header**, which today has just the back arrow,
project name, and "Add column".

## Scope

Single file: `client/src/components/Board.tsx`.

No backend, API-client, or CLI changes.

## Design

### Header layout

The toggle is a secondary action and sits to the left of the primary
"Add column" button:

```
[<] My Project  [Completed]          [Reopen project] [+ Add column]   (completed)
[<] My Project                       [Complete project] [+ Add column] (active)
```

### Behavior

- **Toggle button** - rendered only once `project` is loaded.
  `variant="outline" size="sm"`. Active state: `CheckCircle2` icon +
  "Complete project". Completed state: `RotateCcw` icon + "Reopen project".
- **Completed badge** - small muted pill
  (`rounded-full border px-2 py-0.5 text-xs text-muted-foreground`) next to the
  project name, shown only when `project.completedAt !== null`.
- **Handlers** - `handleComplete` / `handleReopen` call the API, then
  `setProject(updated)` from the returned object. No board refresh and **no card
  movement**: card columns are preserved, honoring existing completion
  semantics. A `busy` boolean disables the button during the request to prevent
  double-fires.
- **No confirm dialog** - matches the Projects-list behavior (only delete
  confirms).

### Error handling

The API call is wrapped in try/catch. On failure, clear `busy` and show a
transient inline message via a local `actionError` state rendered in the header.
The board's existing full-screen `error` state is reserved for load failures and
is intentionally not reused, so a failed toggle never blanks the board.

## Testing

No automated test harness exists in this project. Verification is manual:

1. Run the dev server (`kanban-ui`).
2. Open a board; confirm "Complete project" shows for an active project.
3. Click it; confirm cards stay in their columns, the "Completed" badge appears,
   and the button switches to "Reopen project".
4. Click "Reopen project"; confirm the badge disappears and the label switches
   back.
