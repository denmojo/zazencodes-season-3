import chalk from "chalk";
import Table from "cli-table3";
import type { Board, Project } from "../types.js";

export function printProjects(projects: Project[]): void {
  if (projects.length === 0) {
    console.log(chalk.dim("No projects found."));
    return;
  }
  const table = new Table({
    head: [
      chalk.cyan("ID"),
      chalk.cyan("Slug"),
      chalk.cyan("Name"),
      chalk.cyan("Created"),
      chalk.cyan("Completed"),
    ],
  });
  for (const p of projects) {
    const completed = p.completedAt
      ? new Date(p.completedAt).toLocaleString()
      : chalk.dim("-");
    const name = p.completedAt ? chalk.dim(p.name) : p.name;
    table.push([p.id, chalk.bold(p.slug), name, new Date(p.createdAt).toLocaleString(), completed]);
  }
  console.log(table.toString());
}

export function printProject(project: Project): void {
  console.log(
    chalk.green("✓"),
    chalk.bold(project.name),
    chalk.dim(`(${project.id})`)
  );
}

export function printBoard(board: Board, projectName?: string, slug?: string): void {
  if (projectName) {
    console.log(chalk.bold.cyan(`\n  ${projectName}\n`));
  }

  const sorted = [...board.columns].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    console.log(chalk.dim("No columns in this board."));
    return;
  }

  const table = new Table({
    head: sorted.map((col) => chalk.cyan.bold(col.title)),
    style: { "padding-left": 1, "padding-right": 1 },
    wordWrap: true,
    colWidths: sorted.map(() => 28),
  });

  const cardsByColumn: Record<string, string[]> = {};
  for (const col of sorted) {
    const cards = board.cards
      .filter((c) => c.columnId === col.id)
      .sort((a, b) => a.order - b.order);
    cardsByColumn[col.id] = cards.map((c) => {
      const desc =
        c.description
          ? chalk.dim(
              c.description.length > 40
                ? c.description.slice(0, 40) + "…"
                : c.description
            )
          : "";
      const idStr = chalk.dim(
        `[${slug && typeof c.number === "number" ? `${slug}-${c.number}` : c.id.slice(0, 8)}]`,
      );
      return `${chalk.white(c.title)}\n${desc ? desc + "\n" : ""}${idStr}`;
    });
  }

  const maxRows = Math.max(
    ...sorted.map((col) => cardsByColumn[col.id].length)
  );

  if (maxRows === 0) {
    table.push(sorted.map(() => chalk.dim("(empty)")));
  } else {
    for (let i = 0; i < maxRows; i++) {
      table.push(
        sorted.map((col) => cardsByColumn[col.id][i] ?? "")
      );
    }
  }

  console.log(table.toString());
  console.log();
}
