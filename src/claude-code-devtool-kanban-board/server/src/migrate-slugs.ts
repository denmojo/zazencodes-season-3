import type { Database } from "./types.js";
import { isValidSlug } from "./slug.js";

/**
 * Pure migration: assign slugs (by project name) and per-board ticket numbers
 * (by card createdAt ascending). Idempotent - a card that already has a number
 * keeps it, and nextTicket is recomputed as max(number)+1. Mutates and returns
 * the same object for convenience; callers pass a clone if they need the input.
 */
export function migrateDatabase(
  dbIn: Database,
  slugByName: Record<string, string>,
): Database {
  const db = dbIn;

  // 1. Validate the slug map against the projects.
  const seen = new Set<string>();
  for (const p of db.projects) {
    const slug = slugByName[p.name];
    if (!slug) throw new Error(`no slug provided for project "${p.name}"`);
    if (!isValidSlug(slug)) throw new Error(`invalid slug "${slug}" for "${p.name}"`);
    if (seen.has(slug)) throw new Error(`duplicate target slug "${slug}"`);
    seen.add(slug);
  }

  // 2. Assign slugs.
  for (const p of db.projects) {
    p.slug = slugByName[p.name];
  }

  // 3. Number cards per board by createdAt ascending, preserving any existing
  //    numbers (idempotency). Newly-numbered cards get the next free integer.
  for (const board of Object.values(db.boards)) {
    const used = new Set<number>();
    for (const c of board.cards) {
      if (typeof (c as { number?: number }).number === "number") {
        used.add((c as { number: number }).number);
      }
    }
    let next = 1;
    const freeNumber = (): number => {
      while (used.has(next)) next++;
      const n = next;
      used.add(n);
      return n;
    };
    const ordered = [...board.cards].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    for (const c of ordered) {
      const cc = c as { number?: number };
      if (typeof cc.number !== "number") cc.number = freeNumber();
    }
    const maxNum = board.cards.reduce(
      (m, c) => Math.max(m, (c as { number: number }).number),
      0,
    );
    board.nextTicket = maxNum + 1;
  }

  return db;
}

/** The authoritative slug table for the 2026-06-05 migration. */
export const SLUG_MAP: Record<string, string> = {
  "kanban-devtool": "kdev",
  "Mojado Runbook": "mojrun",
  "Mojado Shop Commerce": "mshop",
  "Claude Awareness Sensors": "sens",
  "SAS Mandate": "sas",
  "PooLogger Phase 2": "plogb",
  "11 Tenets Second Edition": "tnet",
  "Essays Collection": "ec",
  "obsidian-unread-dot": "urd",
  "vault-scripts": "vs",
  "Mojado Site Migrations": "sitmig",
  "PooLogger Phase 1": "ploga",
  "Full Profile deep-delve": "fprf",
  "denco-shop": "denco",
  "Email/SMS Trip Log Ingest": "tlog",
};
