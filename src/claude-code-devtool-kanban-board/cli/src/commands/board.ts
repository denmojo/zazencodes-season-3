import { Command } from "commander";
import { api } from "../api.js";
import { handleError } from "../utils/errors.js";
import { printBoard } from "../utils/display.js";

export const boardCmd = new Command("board")
  .description("Show the board for a project")
  .argument("<project>", "Project slug or ID")
  .action(async (project: string) => {
    try {
      const [board, projects] = await Promise.all([
        api.getBoard(project),
        api.listProjects(),
      ]);
      const found = projects.find((p) => p.slug === project || p.id === project);
      printBoard(board, found?.name, found?.slug);
    } catch (err) {
      handleError(err);
    }
  });
