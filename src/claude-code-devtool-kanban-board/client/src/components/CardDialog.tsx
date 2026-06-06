import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardActivity } from "./CardActivity";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string;
  onSubmit: (title: string, description: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  projectId?: string;
  cardId?: string;
  /** Ticket id (e.g. "kdev-7"); shown as the dialog title in edit mode. */
  ticketId?: string;
};

export function CardDialog({
  open,
  onOpenChange,
  mode,
  initialTitle = "",
  initialDescription = "",
  onSubmit,
  onDelete,
  projectId,
  cardId,
  ticketId,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
    }
  }, [open, initialTitle, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isCreate = mode === "create";
  // In edit mode the title carries the ticket id (e.g. "kdev-7"); the fields
  // are self-evidently editable, so the "Update card details" subtitle is dropped.
  const headerTitle = isCreate ? "New card" : (ticketId ?? "Edit card");
  const headerDesc = isCreate ? "Add a new card to this column." : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...(headerDesc ? {} : { "aria-describedby": undefined })}>
        <DialogHeader>
          <DialogTitle className={!isCreate && ticketId ? "font-mono" : undefined}>
            {headerTitle}
          </DialogTitle>
          {headerDesc && <DialogDescription>{headerDesc}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="card-title">
              Title
            </label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="card-description">
              Description
            </label>
            <Textarea
              id="card-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          {mode === "edit" && open && projectId && cardId && (
            <CardActivity projectId={projectId} cardId={cardId} />
          )}
          <DialogFooter className="sm:justify-between">
            <div>
              {mode === "edit" && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      await onDelete();
                      onOpenChange(false);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title.trim()}>
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
