import { forwardRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Card as CardType } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  card: CardType;
  onClick: () => void;
  slug?: string;
};

function relative(at: string | undefined): string | null {
  if (!at) return null;
  const then = new Date(at).getTime();
  if (Number.isNaN(then)) return null;
  const sec = Math.round((Date.now() - then) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

type ViewProps = {
  card: CardType;
  /** Faded placeholder left behind in the column while dragging. */
  dragging?: boolean;
  /** Rendered inside the DragOverlay (floating clone under the cursor). */
  overlay?: boolean;
  /** Project slug for rendering the ticket badge (e.g. "kdev"). */
  slug?: string;
} & React.HTMLAttributes<HTMLDivElement>;

// Presentational card. Shared by the in-column draggable and the DragOverlay
// clone so both look identical.
export const CardView = forwardRef<HTMLDivElement, ViewProps>(
  ({ card, dragging, overlay, slug, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md border bg-card p-3 text-sm shadow-sm select-none",
        "cursor-grab active:cursor-grabbing hover:border-ring transition-colors",
        dragging && "opacity-40",
        overlay && "cursor-grabbing rotate-2 shadow-lg ring-2 ring-ring",
        className,
      )}
      {...rest}
    >
      {slug && typeof card.number === "number" && (
        <div className="mb-1 font-mono text-[10px] text-muted-foreground">
          {slug}-{card.number}
        </div>
      )}
      <div className="font-medium text-card-foreground break-words">
        {card.title}
      </div>
      {card.description && (
        <div className="mt-1 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">
          {card.description}
        </div>
      )}
      {card.updatedAt && (
        <div
          className="mt-2 text-[10px] text-muted-foreground tabular-nums"
          title={`Updated ${card.updatedAt}`}
        >
          {relative(card.updatedAt)}
        </div>
      )}
    </div>
  ),
);
CardView.displayName = "CardView";

export function Card({ card, onClick, slug }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { type: "card", card },
  });

  // No transform is applied to the source node: while dragging it stays put as
  // a faded placeholder and the moving clone is rendered by the DragOverlay in
  // Board.tsx, which portals to <body> so it floats above the columns instead
  // of being clipped by their overflow.
  return (
    <CardView
      ref={setNodeRef}
      card={card}
      dragging={isDragging}
      slug={slug}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // ignore click that ends a drag
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
    />
  );
}
