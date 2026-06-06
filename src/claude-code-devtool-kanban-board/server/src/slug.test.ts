import { describe, expect, it } from "vitest";
import { normalizeSlug, isValidSlug, resolveProjectId } from "./slug.js";
import type { Project } from "./types.js";

const projects: Project[] = [
  { id: "guid-kdev", slug: "kdev", name: "kanban-devtool", createdAt: "2026-05-28T14:01:13.000Z", completedAt: null },
  { id: "guid-shop", slug: "mshop", name: "Mojado Shop Commerce", createdAt: "2026-05-28T21:00:00.000Z", completedAt: null },
];

describe("normalizeSlug", () => {
  it("lowercases and hyphenates whitespace", () => {
    expect(normalizeSlug("Poo 1")).toBe("poo-1");
  });
  it("strips invalid characters and collapses hyphens", () => {
    expect(normalizeSlug("  Full__Profile! ")).toBe("full-profile");
  });
  it("trims leading/trailing hyphens", () => {
    expect(normalizeSlug("-abc-")).toBe("abc");
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase alnum and internal hyphens", () => {
    expect(isValidSlug("kdev")).toBe(true);
    expect(isValidSlug("denco-shop")).toBe(true);
    expect(isValidSlug("tnet")).toBe(true);
  });
  it("rejects empty, uppercase, leading hyphen, and reserved words", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Kdev")).toBe(false);
    expect(isValidSlug("-x")).toBe(false);
    expect(isValidSlug("projects")).toBe(false);
  });
});

describe("resolveProjectId", () => {
  it("resolves by slug", () => {
    expect(resolveProjectId(projects, "kdev")).toBe("guid-kdev");
  });
  it("resolves by guid (fallback)", () => {
    expect(resolveProjectId(projects, "guid-shop")).toBe("guid-shop");
  });
  it("returns null for unknown keys", () => {
    expect(resolveProjectId(projects, "nope")).toBeNull();
  });
});
