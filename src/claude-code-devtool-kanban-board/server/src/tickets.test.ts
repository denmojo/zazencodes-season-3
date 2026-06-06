import { describe, expect, it } from "vitest";
import { formatTicket, resolveCardId } from "./tickets.js";
import type { Board } from "./types.js";

const board: Board = {
  nextTicket: 8,
  columns: [{ id: "c1", title: "To Do", order: 0 }],
  cards: [
    { id: "guid-a", number: 1, columnId: "c1", title: "A", description: "", order: 0, createdAt: "x", updatedAt: "x" },
    { id: "guid-g", number: 7, columnId: "c1", title: "G", description: "", order: 1, createdAt: "x", updatedAt: "x" },
  ],
};

describe("formatTicket", () => {
  it("joins slug and number", () => {
    expect(formatTicket("kdev", 7)).toBe("kdev-7");
  });
});

describe("resolveCardId", () => {
  it("resolves by '<slug>-<n>'", () => {
    expect(resolveCardId(board, "kdev", "kdev-7")).toBe("guid-g");
  });
  it("resolves by bare number", () => {
    expect(resolveCardId(board, "kdev", "7")).toBe("guid-g");
  });
  it("resolves by raw card GUID (fallback)", () => {
    expect(resolveCardId(board, "kdev", "guid-a")).toBe("guid-a");
  });
  it("rejects a ticket whose prefix is a different slug", () => {
    expect(resolveCardId(board, "kdev", "mshop-7")).toBeNull();
  });
  it("returns null for an unknown number", () => {
    expect(resolveCardId(board, "kdev", "kdev-999")).toBeNull();
  });
});
