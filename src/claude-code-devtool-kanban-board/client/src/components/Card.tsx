import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Card as CardType } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  card: CardType;
  onClick: () => void;
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

export function Card({ card, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id, data: { type: "card", card } });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // ignore click that ends a drag
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "rounded-md border bg-card p-3 text-sm shadow-sm cursor-grab active:cursor-grabbing select-none",
        "hover:border-ring transition-colors",
        isDragging && "opacity-40",
      )}
    >
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
  );
}
