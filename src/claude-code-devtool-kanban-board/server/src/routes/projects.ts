import { Router } from "express";
import { createProject, mutateDb, readDb } from "../db.js";
import { archiveProjectEvents, deleteArchive } from "../archive.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const db = await readDb();
  const projects = [...db.projects].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  res.json(projects);
});

projectsRouter.post("/", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });

  const project = await mutateDb((db, emit) => {
    const { project, board } = createProject(name);
    db.projects.push(project);
    db.boards[project.id] = board;
    emit("project.created", {
      projectId: project.id,
      data: { name: project.name },
    });
    return project;
  });
  res.status(201).json(project);
});

projectsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const updated = await mutateDb((db, emit) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return null;
    const next = name.trim();
    if (next !== project.name) {
      emit("project.renamed", {
        projectId: project.id,
        data: { from: project.name, to: next },
      });
      project.name = next;
    }
    return project;
  });
  if (!updated) return res.status(404).json({ error: "project not found" });
  res.json(updated);
});

projectsRouter.post("/:id/complete", async (req, res) => {
  const { id } = req.params;
  const updated = await mutateDb(async (db, emit) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return null;
    project.completedAt = new Date().toISOString();
    emit("project.completed", {
      projectId: project.id,
      data: { completedAt: project.completedAt },
    });
    const toArchive = db.events.filter((e) => e.projectId === id);
    if (toArchive.length > 0) {
      await archiveProjectEvents(id, toArchive);
      db.events = db.events.filter((e) => e.projectId !== id);
    }
    return project;
  });
  if (!updated) return res.status(404).json({ error: "project not found" });
  res.json(updated);
});

projectsRouter.post("/:id/reopen", async (req, res) => {
  const { id } = req.params;
  const updated = await mutateDb((db, emit) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return null;
    project.completedAt = null;
    emit("project.reopened", {
      projectId: project.id,
      data: {},
    });
    return project;
  });
  if (!updated) return res.status(404).json({ error: "project not found" });
  res.json(updated);
});

projectsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const ok = await mutateDb(async (db, emit) => {
    const idx = db.projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const removed = db.projects[idx];
    db.projects.splice(idx, 1);
    delete db.boards[id];
    db.events = db.events.filter((e) => e.projectId !== id);
    await deleteArchive(id);
    emit("project.deleted", {
      projectId: removed.id,
      data: { name: removed.name },
    });
    return true;
  });
  if (!ok) return res.status(404).json({ error: "project not found" });
  res.status(204).end();
});

projectsRouter.get("/:id/board", async (req, res) => {
  const { id } = req.params;
  const db = await readDb();
  const board = db.boards[id];
  if (!board) return res.status(404).json({ error: "project not found" });
  res.json(board);
});
