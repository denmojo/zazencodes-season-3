import type { Board } from "./types.js";

/** The human display id for a card. */
export function formatTicket(slug: string, num: number): string {
  return `${slug}-${num}`;
}

/**
 * Resolve a card key within a board to the card's canonical GUID.
 * Accepts, in order: a raw card GUID; the exact ticket `<slug>-<n>`; a bare
 * `<n>`. A `<prefix>-<n>` whose prefix is not this project's slug is rejected
 * (prevents `mshop-7` resolving on the kdev board). Returns null if unmatched.
 */
export function resolveCardId(
  board: Board,
  slug: string,
  key: string,
): string | null {
  // 1. Raw GUID fallback (keeps old references working).
  if (board.cards.some((c) => c.id === key)) return key;

  // 2. Determine the ticket number, if any.
  let num: number | null = null;
  if (/^\d+$/.test(key)) {
    num = Number(key);
  } else {
    const m = key.match(/^(.+)-(\d+)$/);
    if (m) {
      if (m[1] !== slug) return null; // wrong-project prefix
      num = Number(m[2]);
    }
  }
  if (num === null) return null;

  const card = board.cards.find((c) => c.number === num);
  return card ? card.id : null;
}
