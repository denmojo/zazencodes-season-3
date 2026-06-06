import { Router } from "express";
import { createProject, mutateDb, readDb } from "../db.js";
import { archiveProjectEvents, deleteArchive } from "../archive.js";
import { isValidSlug, resolveProject } from "../slug.js";

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
  const slug = String(req.body?.slug ?? "").trim();
  if (!isValidSlug(slug)) {
    return res.status(400).json({
      error:
        "slug must match ^[a-z0-9][a-z0-9-]*$, be non-reserved, and is required",
    });
  }

  const result = await mutateDb((db, emit) => {
    if (db.projects.some((p) => p.slug === slug)) return null;
    const { project, board } = createProject(name, slug);
    db.projects.push(project);
    db.boards[project.id] = board;
    emit("project.created", {
      projectId: project.id,
      data: { name: project.name, slug: project.slug },
    });
    return project;
  });
  if (!result) return res.status(409).json({ error: "slug already in use" });
  res.status(201).json(result);
});

projectsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const updated = await mutateDb((db, emit) => {
    const project = resolveProject(db.projects, id);
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
    const project = resolveProject(db.projects, id);
    if (!project) return null;
    project.completedAt = new Date().toISOString();
    emit("project.completed", {
      projectId: project.id,
      data: { completedAt: project.completedAt },
    });
    const toArchive = db.events.filter((e) => e.projectId === project.id);
    if (toArchive.length > 0) {
      await archiveProjectEvents(project.id, toArchive);
      db.events = db.events.filter((e) => e.projectId !== project.id);
    }
    return project;
  });
  if (!updated) return res.status(404).json({ error: "project not found" });
  res.json(updated);
});

projectsRouter.post("/:id/reopen", async (req, res) => {
  const { id } = req.params;
  const updated = await mutateDb((db, emit) => {
    const project = resolveProject(db.projects, id);
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
    const idx = db.projects.findIndex((p) => p.id === id || p.slug === id);
    if (idx === -1) return false;
    const removed = db.projects[idx];
    const canonical = removed.id;
    db.projects.splice(idx, 1);
    delete db.boards[canonical];
    db.events = db.events.filter((e) => e.projectId !== canonical);
    await deleteArchive(canonical);
    emit("project.deleted", { projectId: canonical, data: { name: removed.name } });
    return true;
  });
  if (!ok) return res.status(404).json({ error: "project not found" });
  res.status(204).end();
});

projectsRouter.get("/:id/board", async (req, res) => {
  const db = await readDb();
  const project = resolveProject(db.projects, req.params.id);
  if (!project) return res.status(404).json({ error: "project not found" });
  res.json(db.boards[project.id]);
});
