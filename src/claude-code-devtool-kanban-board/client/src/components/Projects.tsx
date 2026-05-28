import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api, type Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { navigate } from "@/hooks/useHashRoute";

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; project: Project };

export function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [showCompleted, setShowCompleted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load projects");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (project: Project) => {
    const ok = window.confirm(
      `Delete project "${project.name}" and its board?`,
    );
    if (!ok) return;
    await api.deleteProject(project.id);
    await refresh();
  };

  const handleComplete = async (project: Project) => {
    await api.completeProject(project.id);
    await refresh();
  };

  const handleReopen = async (project: Project) => {
    await api.reopenProject(project.id);
    await refresh();
  };

  const active = (projects ?? []).filter((p) => p.completedAt === null);
  const completed = (projects ?? []).filter((p) => p.completedAt !== null);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
        <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 text-sm text-destructive">{error}</div>
        )}
        {projects === null ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : active.length === 0 && completed.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No projects yet. Click "New project" to create your first board.
          </div>
        ) : (
          <>
            {active.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active projects.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    onOpen={() => navigate(`/projects/${p.id}`)}
                    onEdit={() => setDialog({ mode: "edit", project: p })}
                    onDelete={() => void handleDelete(p)}
                    onComplete={() => void handleComplete(p)}
                  />
                ))}
              </ul>
            )}

            {completed.length > 0 && (
              <div className="mt-8">
                <button
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCompleted((v) => !v)}
                >
                  {showCompleted ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Completed ({completed.length})
                </button>
                {showCompleted && (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {completed.map((p) => (
                      <ProjectItem
                        key={p.id}
                        project={p}
                        onOpen={() => navigate(`/projects/${p.id}`)}
                        onEdit={() => setDialog({ mode: "edit", project: p })}
                        onDelete={() => void handleDelete(p)}
                        onReopen={() => void handleReopen(p)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ProjectDialog
        state={dialog}
        onOpenChange={(open) => !open && setDialog({ mode: "closed" })}
        onSubmit={async (name) => {
          if (dialog.mode === "create") {
            await api.createProject(name);
          } else if (dialog.mode === "edit") {
            await api.renameProject(dialog.project.id, name);
          }
          await refresh();
        }}
      />
    </div>
  );
}

type ProjectItemProps = {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onComplete?: () => void;
  onReopen?: () => void;
};

function ProjectItem({
  project,
  onOpen,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
}: ProjectItemProps) {
  const isCompleted = project.completedAt !== null;
  return (
    <li
      className={`group flex items-center justify-between rounded-lg border p-4 transition-colors ${
        isCompleted
          ? "bg-muted/20 opacity-60 hover:opacity-100"
          : "bg-muted/40 hover:bg-muted"
      }`}
    >
      <button className="flex-1 text-left" onClick={onOpen}>
        <div
          className={`font-semibold tracking-tight ${
            isCompleted ? "text-muted-foreground" : ""
          }`}
        >
          {project.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {isCompleted
            ? `Completed ${new Date(project.completedAt!).toLocaleDateString()}`
            : `Created ${new Date(project.createdAt).toLocaleDateString()}`}
        </div>
      </button>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onComplete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            aria-label="Mark project completed"
            title="Mark completed"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onReopen && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onReopen();
            }}
            aria-label="Reopen project"
            title="Reopen"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label="Rename project"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete project"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

type ProjectDialogProps = {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
};

function ProjectDialog({ state, onOpenChange, onSubmit }: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.mode === "edit") setName(state.project.name);
    else if (state.mode === "create") setName("");
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isCreate = state.mode === "create";

  return (
    <Dialog open={state.mode !== "closed"} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "New project" : "Rename project"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Each project has its own isolated kanban board."
              : "Update the project name."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="project-name">
              Name
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {isCreate ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
