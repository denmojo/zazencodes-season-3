#!/usr/bin/env node
import { program } from "commander";
import { projectsCmd } from "./commands/projects.js";
import { boardCmd } from "./commands/board.js";
import { columnsCmd } from "./commands/columns.js";
import { cardsCmd } from "./commands/cards.js";
import { historyCmd } from "./commands/history.js";

program
  .name("kanban")
  .description("CLI for the Kanban board API")
  .version("1.0.0")
  .addCommand(projectsCmd)
  .addCommand(boardCmd)
  .addCommand(columnsCmd)
  .addCommand(cardsCmd)
  .addCommand(historyCmd);

program.parse();
