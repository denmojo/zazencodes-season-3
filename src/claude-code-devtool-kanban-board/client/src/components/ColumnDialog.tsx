import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialTitle?: string;
  /** Number of columns currently on the board (in edit mode this includes the column being edited). */
  columnCount: number;
  /** Edit mode: the column's current order. Ignored in create mode. */
  initialOrder?: number;
  onSubmit: (values: { title: string; order: number }) => Promise<void> | void;
};

export function ColumnDialog({
  open,
  onOpenChange,
  mode,
  initialTitle = "",
  columnCount,
  initialOrder = 0,
  onSubmit,
}: Props) {
  // Create: a new column can land anywhere from 0 (first) to columnCount (end).
  // Edit: an existing column occupies one of columnCount slots, so 0..columnCount-1.
  const maxOrder = mode === "create" ? columnCount : Math.max(0, columnCount - 1);
  const defaultOrder = mode === "create" ? columnCount : initialOrder;
  const clamp = (n: number) => Math.max(0, Math.min(maxOrder, n));

  const [title, setTitle] = useState(initialTitle);
  const [order, setOrder] = useState(clamp(defaultOrder));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setOrder(clamp(defaultOrder));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTitle, defaultOrder, maxOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), order: clamp(order) });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const orderLabel = mode === "create" ? "Position" : "Order";
  const orderHint =
    mode === "create"
      ? `0 = first, ${maxOrder} = end`
      : `0 = first, ${maxOrder} = last`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New column" : "Edit column"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new column and choose where it goes."
              : "Update the column title or move it to a new position."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="column-title">
              Title
            </label>
            <Input
              id="column-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="column-order">
              {orderLabel}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="column-order"
                type="number"
                min={0}
                max={maxOrder}
                value={order}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) setOrder(clamp(n));
                }}
                className="w-20"
              />
              <div className="flex flex-col">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-5 w-7 rounded-b-none"
                  onClick={() => setOrder((o) => clamp(o + 1))}
                  disabled={order >= maxOrder}
                  aria-label={`Increase ${orderLabel.toLowerCase()}`}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-5 w-7 rounded-t-none border-t-0"
                  onClick={() => setOrder((o) => clamp(o - 1))}
                  disabled={order <= 0}
                  aria-label={`Decrease ${orderLabel.toLowerCase()}`}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">{orderHint}</span>
            </div>
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
            <Button type="submit" disabled={submitting || !title.trim()}>
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
