import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate-slugs.js";
import type { Database } from "./types.js";

function db(): Database {
  return {
    projects: [
      { id: "p1", slug: "", name: "kanban-devtool", createdAt: "2026-05-28T14:01:13.000Z", completedAt: null } as any,
      { id: "p2", slug: "", name: "denco-shop", createdAt: "2026-05-28T14:51:19.000Z", completedAt: "2026-05-28T15:21:21.000Z" } as any,
    ],
    boards: {
      p1: {
        columns: [{ id: "c", title: "Done", order: 0 }],
        cards: [
          { id: "g2", columnId: "c", title: "second", description: "", order: 1, createdAt: "2026-05-28T20:00:00.000Z", updatedAt: "x" } as any,
          { id: "g1", columnId: "c", title: "first", description: "", order: 0, createdAt: "2026-05-28T10:00:00.000Z", updatedAt: "x" } as any,
        ],
      } as any,
      p2: { columns: [], cards: [], } as any,
    },
    events: [],
  };
}

describe("migrateDatabase", () => {
  it("assigns slugs from the map", () => {
    const out = migrateDatabase(db(), { "kanban-devtool": "kdev", "denco-shop": "denco" });
    expect(out.projects.find((p) => p.id === "p1")!.slug).toBe("kdev");
    expect(out.projects.find((p) => p.id === "p2")!.slug).toBe("denco");
  });
  it("numbers cards by createdAt ascending and sets nextTicket", () => {
    const out = migrateDatabase(db(), { "kanban-devtool": "kdev", "denco-shop": "denco" });
    const cards = out.boards.p1.cards;
    expect(cards.find((c) => c.id === "g1")!.number).toBe(1); // earliest createdAt
    expect(cards.find((c) => c.id === "g2")!.number).toBe(2);
    expect(out.boards.p1.nextTicket).toBe(3);
    expect(out.boards.p2.nextTicket).toBe(1); // empty board
  });
  it("is idempotent: re-running does not renumber", () => {
    const once = migrateDatabase(db(), { "kanban-devtool": "kdev", "denco-shop": "denco" });
    const twice = migrateDatabase(structuredClone(once), { "kanban-devtool": "kdev", "denco-shop": "denco" });
    expect(twice.boards.p1.cards.find((c) => c.id === "g1")!.number).toBe(1);
    expect(twice.boards.p1.nextTicket).toBe(3);
  });
  it("throws if a project has no slug in the map", () => {
    expect(() => migrateDatabase(db(), { "kanban-devtool": "kdev" })).toThrow(/no slug/i);
  });
  it("throws on duplicate target slugs", () => {
    expect(() => migrateDatabase(db(), { "kanban-devtool": "dup", "denco-shop": "dup" })).toThrow(/duplicate/i);
  });
});
