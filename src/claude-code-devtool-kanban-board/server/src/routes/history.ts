import { Router } from "express";
import { readDb } from "../db.js";
import { loadArchivedEvents } from "../archive.js";
import type { Event, EventType } from "../types.js";
import { resolveProject } from "../slug.js";
import { resolveCardId } from "../tickets.js";

export const historyRouter = Router({ mergeParams: true });

function filterEvents(
  events: Event[],
  opts: { projectId: string; cardId?: string; type?: string; since?: string },
): Event[] {
  let out = events.filter((e) => e.projectId === opts.projectId);
  if (opts.cardId) out = out.filter((e) => e.cardId === opts.cardId);
  if (opts.type) {
    const types = new Set(opts.type.split(","));
    out = out.filter((e) => types.has(e.type as EventType));
  }
  if (opts.since) out = out.filter((e) => e.at >= opts.since!);
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

async function gatherEvents(
  db: { events: Event[] },
  projectId: string,
): Promise<Event[]> {
  const archived = await loadArchivedEvents(projectId);
  return [...db.events, ...archived];
}

historyRouter.get("/projects/:projectId/history", async (req, res) => {
  const db = await readDb();
  const project = resolveProject(db.projects, req.params.projectId);
  if (!project) return res.status(404).json({ error: "project not found" });
  const projectId = project.id;
  const cardId = typeof req.query.cardId === "string" ? req.query.cardId : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const since = typeof req.query.since === "string" ? req.query.since : undefined;
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

  const all = await gatherEvents(db, projectId);
  let events = filterEvents(all, { projectId, cardId, type, since });
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    events = events.slice(0, limit);
  }
  res.json(events);
});

historyRouter.get(
  "/projects/:projectId/cards/:cardId/history",
  async (req, res) => {
    const db = await readDb();
    const project = resolveProject(db.projects, req.params.projectId);
    if (!project) return res.status(404).json({ error: "project not found" });
    const board = db.boards[project.id];
    // Fall back to the raw URL param when the board is absent (board-less
    // project) or the key matches no card; resolveCardId would throw on an
    // undefined board, so guard it.
    const cardId = board
      ? (resolveCardId(board, project.slug, req.params.cardId) ?? req.params.cardId)
      : req.params.cardId;
    const all = await gatherEvents(db, project.id);
    const events = filterEvents(all, { projectId: project.id, cardId });
    res.json(events);
  },
);
