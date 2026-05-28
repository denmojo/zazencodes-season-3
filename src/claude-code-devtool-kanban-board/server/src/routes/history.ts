import { Router } from "express";
import { readDb } from "../db.js";
import { loadArchivedEvents } from "../archive.js";
import type { Event, EventType } from "../types.js";

export const historyRouter = Router({ mergeParams: true });

type Params = { projectId: string; cardId?: string };

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
  const { projectId } = req.params as unknown as Params;
  const db = await readDb();
  if (!db.boards[projectId] && !db.projects.find((p) => p.id === projectId)) {
    return res.status(404).json({ error: "project not found" });
  }
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
    const { projectId, cardId } = req.params as unknown as Params;
    const db = await readDb();
    if (!db.boards[projectId]) {
      return res.status(404).json({ error: "project not found" });
    }
    const all = await gatherEvents(db, projectId);
    const events = filterEvents(all, { projectId, cardId });
    res.json(events);
  },
);
