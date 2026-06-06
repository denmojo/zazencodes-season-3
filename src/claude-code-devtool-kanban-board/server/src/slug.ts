import type { Project } from "./types.js";

// Slugs that would collide with route segments or be confusing as identifiers.
const RESERVED = new Set(["projects", "api", "board", "new", "card"]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** True if `s` is already a well-formed, non-reserved slug. */
export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s) && !RESERVED.has(s);
}

/** Best-effort coercion of arbitrary input into a valid slug shape. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Resolve a slug-or-GUID to a project's canonical GUID, or null if unknown. */
export function resolveProjectId(
  projects: Project[],
  key: string,
): string | null {
  const bySlug = projects.find((p) => p.slug === key);
  if (bySlug) return bySlug.id;
  const byId = projects.find((p) => p.id === key);
  return byId ? byId.id : null;
}

/** Resolve a slug-or-GUID to the full project record, or null. */
export function resolveProject(
  projects: Project[],
  key: string,
): Project | null {
  return (
    projects.find((p) => p.slug === key) ??
    projects.find((p) => p.id === key) ??
    null
  );
}
