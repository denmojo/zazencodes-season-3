import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateDatabase, SLUG_MAP } from "../src/migrate-slugs.js";
import type { Database } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../data/db.json"); // symlink → vault

async function main() {
  const apply = process.argv.includes("--apply");
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const db = JSON.parse(raw) as Database;

  const before = structuredClone(db);
  const out = migrateDatabase(db, SLUG_MAP);

  // Dry-run report.
  console.log("\nProject → slug, and ticket assignments:\n");
  for (const p of out.projects) {
    const board = out.boards[p.id];
    const n = board?.cards.length ?? 0;
    console.log(`  ${p.name}  →  ${p.slug}   (${n} cards, nextTicket=${board?.nextTicket})`);
    const ordered = [...(board?.cards ?? [])].sort(
      (a, b) => (a as any).number - (b as any).number,
    );
    for (const c of ordered) {
      console.log(`      ${p.slug}-${(c as any).number}  ${c.title.slice(0, 48)}`);
    }
  }

  // Assertions: count parity + unique slugs + contiguous-from-1 numbering.
  const slugs = new Set(out.projects.map((p) => p.slug));
  if (slugs.size !== out.projects.length) throw new Error("slug collision after migration");
  for (const p of out.projects) {
    const nums = (out.boards[p.id]?.cards ?? []).map((c) => (c as any).number).sort((a: number, b: number) => a - b);
    nums.forEach((num: number, i: number) => {
      if (num !== i + 1) throw new Error(`non-contiguous numbering on ${p.slug}: got ${num} at index ${i}`);
    });
    const beforeCount = before.boards[p.id]?.cards.length ?? 0;
    const afterCount = out.boards[p.id]?.cards.length ?? 0;
    if (beforeCount !== afterCount) throw new Error(`card count changed on ${p.slug}`);
  }

  if (!apply) {
    console.log("\nDRY RUN only. Re-run with --apply to write db.json.\n");
    return;
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log("\nApplied. db.json updated.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
