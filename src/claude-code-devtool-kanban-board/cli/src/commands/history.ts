import { Command } from "commander";
import chalk from "chalk";
import { api } from "../api.js";
import { handleError } from "../utils/errors.js";
import type { Event } from "../types.js";

function relative(at: string): string {
  const then = new Date(at).getTime();
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function summarize(e: Event): string {
  const d = e.data as Record<string, unknown>;
  switch (e.type) {
    case "card.created":
      return `created in ${chalk.cyan(String(d.columnTitle ?? "?"))} - "${String(d.title ?? "")}"`;
    case "card.moved":
      return `moved ${chalk.cyan(String(d.fromColumnTitle ?? "?"))} ${chalk.dim("→")} ${chalk.cyan(String(d.toColumnTitle ?? "?"))}`;
    case "card.renamed":
      return `renamed "${String(d.from ?? "")}" ${chalk.dim("→")} "${String(d.to ?? "")}"`;
    case "card.description_changed":
      return `description ${String(d.fromLength ?? "?")} ${chalk.dim("→")} ${String(d.toLength ?? "?")} chars`;
    case "card.deleted":
      return `deleted from ${chalk.cyan(String(d.lastColumnTitle ?? "?"))} - "${String(d.title ?? "")}"`;
    case "column.created":
      return `column created - "${String(d.title ?? "")}"`;
    case "column.renamed":
      return `column renamed "${String(d.from ?? "")}" ${chalk.dim("→")} "${String(d.to ?? "")}"`;
    case "column.deleted":
      return `column deleted - "${String(d.title ?? "")}" (${String(d.deletedCardCount ?? 0)} cards)`;
    case "project.created":
      return `project created - "${String(d.name ?? "")}"`;
    case "project.renamed":
      return `project renamed "${String(d.from ?? "")}" ${chalk.dim("→")} "${String(d.to ?? "")}"`;
    case "project.completed":
      return `project marked completed`;
    case "project.reopened":
      return `project reopened`;
    case "project.deleted":
      return `project deleted - "${String(d.name ?? "")}"`;
  }
}

function printEvent(e: Event, opts: { showCardId?: boolean } = {}): void {
  const time = chalk.dim(`${relative(e.at)}  ${e.at}`);
  const type = chalk.bold(e.type);
  const cardSuffix =
    opts.showCardId && e.cardId
      ? chalk.dim(`  card=${e.cardId.slice(0, 8)}`)
      : "";
  console.log(`${time}  ${type}  ${summarize(e)}${cardSuffix}`);
}

export const historyCmd = new Command("history")
  .description("Show a project's event history (newest first)")
  .argument("<projectId>", "Project ID")
  .option("-c, --card <cardId>", "Filter to a single card")
  .option(
    "-t, --type <types>",
    "Comma-separated event types to include (e.g. card.moved,card.created)",
  )
  .option("-s, --since <iso>", "Only events at or after this ISO timestamp")
  .option("-n, --limit <number>", "Limit number of events", (v) => parseInt(v, 10))
  .action(
    async (
      projectId: string,
      opts: { card?: string; type?: string; since?: string; limit?: number },
    ) => {
      try {
        const events = await api.projectHistory(projectId, {
          cardId: opts.card,
          type: opts.type,
          since: opts.since,
          limit: opts.limit,
        });
        if (events.length === 0) {
          console.log(chalk.dim("No events."));
          return;
        }
        for (const e of events) printEvent(e, { showCardId: !opts.card });
      } catch (err) {
        handleError(err);
      }
    },
  );
