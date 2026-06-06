import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { projectsRouter } from "./routes/projects.js";
import { columnsRouter } from "./routes/columns.js";
import { cardsRouter } from "./routes/cards.js";
import { historyRouter } from "./routes/history.js";
import { readDb } from "./db.js";
import { resolveProject } from "./slug.js";
import type { Project } from "./types.js";

// Augment Express's Request with the resolved project (set by the middleware).
declare module "express-serve-static-core" {
  interface Request {
    project?: Project;
  }
}

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

async function resolveProjectParam(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = String(req.params.projectId);
  const db = await readDb();
  const project = resolveProject(db.projects, key);
  if (!project) return res.status(404).json({ error: "project not found" });
  // Stash the resolved project. We do NOT rewrite req.params.projectId: Express
  // re-derives params from the raw URL for each mergeParams sub-router layer, so
  // a rewrite here would be clobbered. Downstream handlers read req.project.id.
  req.project = project;
  next();
}

app.use("/api/projects", projectsRouter);
app.use("/api/projects/:projectId/columns", resolveProjectParam, columnsRouter);
app.use("/api/projects/:projectId/cards", resolveProjectParam, cardsRouter);
app.use("/api", historyRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
