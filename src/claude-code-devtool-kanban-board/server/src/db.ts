import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { Board, Database, Event, EventType, Project } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../data/db.json");
const LEGACY_FILE = path.resolve(__dirname, "../data/board.json");

function emptyBoard(): Board {
  return {
    columns: [
      { id: randomUUID(), title: "To Do", order: 0 },
      { id: randomUUID(), title: "In Progress", order: 1 },
      { id: randomUUID(), title: "Done", order: 2 },
    ],
    cards: [],
    nextTicket: 1,
  };
}

function isDatabase(value: unknown): value is Database {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Database).projects) &&
    typeof (value as Database).boards === "object" &&
    (value as Database).boards !== null
  );
}

let writeQueue: Promise<void> = Promise.resolve();

async function migrateIfNeeded(): Promise<Database> {
  try {
    const raw = await fs.readFile(LEGACY_FILE, "utf8");
    const legacy = JSON.parse(raw) as Board;
    legacy.nextTicket = legacy.nextTicket ?? 1;
    const project = {
      id: randomUUID(),
      slug: "default",
      name: "Default",
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const db: Database = {
      projects: [project],
      boards: { [project.id]: legacy },
      events: [],
    };
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(LEGACY_FILE, `${LEGACY_FILE}.migrated`);
    return db;
  } catch {
    const project = {
      id: randomUUID(),
      slug: "default",
      name: "Default",
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const db: Database = {
      projects: [project],
      boards: { [project.id]: emptyBoard() },
      events: [],
    };
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await migrateIfNeeded();
  }
}

export async function readDb(): Promise<Database> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  if (!isDatabase(parsed)) {
    return migrateIfNeeded();
  }
  for (const p of parsed.projects) {
    if (p.completedAt === undefined) p.completedAt = null;
  }
  if (!Array.isArray(parsed.events)) parsed.events = [];
  const now = new Date().toISOString();
  for (const board of Object.values(parsed.boards)) {
    for (const card of board.cards) {
      if (typeof card.createdAt !== "string") card.createdAt = now;
      if (typeof card.updatedAt !== "string") card.updatedAt = card.createdAt;
    }
    // Ticket-number invariants (defensive; the migration is the real source).
    if (typeof board.nextTicket !== "number") {
      const maxNum = board.cards.reduce((m, c) => Math.max(m, c.number ?? 0), 0);
      board.nextTicket = maxNum + 1;
    }
  }
  return parsed;
}

export async function writeDb(db: Database): Promise<void> {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8"),
  );
  await writeQueue;
}

export type BoardEmit = (
  type: EventType,
  partial: Omit<Event, "id" | "at" | "projectId" | "type">,
) => void;

export type DbEmit = (
  type: EventType,
  partial: Omit<Event, "id" | "at" | "type">,
) => void;

function makeEvent(
  type: EventType,
  partial: Omit<Event, "id" | "at" | "type">,
): Event {
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    type,
    ...partial,
  };
}

export async function mutateDb<T>(
  fn: (db: Database, emit: DbEmit) => T | Promise<T>,
): Promise<T> {
  const db = await readDb();
  const pending: Event[] = [];
  const emit: DbEmit = (type, partial) =>
    pending.push(makeEvent(type, partial));
  const result = await fn(db, emit);
  db.events.push(...pending);
  await writeDb(db);
  return result;
}

export async function mutateBoard<T>(
  projectId: string,
  fn: (board: Board, emit: BoardEmit) => T | Promise<T>,
): Promise<T | null> {
  const db = await readDb();
  const board = db.boards[projectId];
  if (!board) return null;
  const pending: Event[] = [];
  const emit: BoardEmit = (type, partial) =>
    pending.push(makeEvent(type, { ...partial, projectId }));
  const result = await fn(board, emit);
  db.events.push(...pending);
  await writeDb(db);
  return result;
}

export function createProject(name: string, slug: string): {
  project: Project;
  board: Board;
} {
  return {
    project: {
      id: randomUUID(),
      slug,
      name,
      createdAt: new Date().toISOString(),
      completedAt: null,
    },
    board: emptyBoard(),
  };
}
