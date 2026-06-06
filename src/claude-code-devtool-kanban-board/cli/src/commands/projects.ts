import { Command } from "commander";
import chalk from "chalk";
import { api } from "../api.js";
import { handleError } from "../utils/errors.js";
import { printProject, printProjects } from "../utils/display.js";

export const projectsCmd = new Command("projects")
  .description("Manage projects");

projectsCmd
  .command("list")
  .description("List projects (active only by default)")
  .option("-a, --all", "Show active and completed projects")
  .option("-c, --completed", "Show only completed projects")
  .action(async (opts: { all?: boolean; completed?: boolean }) => {
    try {
      const projects = await api.listProjects();
      const filtered = opts.all
        ? projects
        : opts.completed
          ? projects.filter((p) => p.completedAt !== null)
          : projects.filter((p) => p.completedAt === null);
      printProjects(filtered);
    } catch (err) {
      handleError(err);
    }
  });

projectsCmd
  .command("create <slug> <name...>")
  .description("Create a new project (slug is the URL id and ticket prefix)")
  .action(async (slug: string, nameParts: string[]) => {
    try {
      const project = await api.createProject(nameParts.join(" "), slug);
      console.log(chalk.green("Project created:"));
      printProject(project);
    } catch (err) {
      handleError(err);
    }
  });

projectsCmd
  .command("rename <projectId> <name>")
  .description("Rename a project")
  .action(async (projectId: string, name: string) => {
    try {
      const project = await api.renameProject(projectId, name);
      console.log(chalk.green("Project renamed:"));
      printProject(project);
    } catch (err) {
      handleError(err);
    }
  });

projectsCmd
  .command("delete <projectId>")
  .description("Delete a project")
  .action(async (projectId: string) => {
    try {
      await api.deleteProject(projectId);
      console.log(chalk.green("✓"), "Project deleted.");
    } catch (err) {
      handleError(err);
    }
  });

projectsCmd
  .command("complete <projectId>")
  .description("Mark a project completed (flag only; cards keep their column)")
  .action(async (projectId: string) => {
    try {
      const project = await api.completeProject(projectId);
      console.log(chalk.green("✓"), "Project completed:");
      printProject(project);
    } catch (err) {
      handleError(err);
    }
  });

projectsCmd
  .command("reopen <projectId>")
  .description("Reopen a completed project (clears completedAt)")
  .action(async (projectId: string) => {
    try {
      const project = await api.reopenProject(projectId);
      console.log(chalk.green("✓"), "Project reopened:");
      printProject(project);
    } catch (err) {
      handleError(err);
    }
  });
