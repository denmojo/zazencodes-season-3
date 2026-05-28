import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Event } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = path.resolve(__dirname, "../data/archive");

function archivePath(projectId: string): string {
  return path.join(ARCHIVE_DIR, `${projectId}.json`);
}

export async function archiveProjectEvents(
  projectId: string,
  events: Event[],
): Promise<void> {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  const file = archivePath(projectId);
  let existing: Event[] = [];
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    // no prior archive
  }
  const merged = [...existing, ...events];
  await fs.writeFile(file, JSON.stringify(merged, null, 2), "utf8");
}

export async function loadArchivedEvents(projectId: string): Promise<Event[]> {
  try {
    const raw = await fs.readFile(archivePath(projectId), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function deleteArchive(projectId: string): Promise<void> {
  try {
    await fs.unlink(archivePath(projectId));
  } catch {
    // no archive to remove
  }
}
