import { useEffect, useState } from "react";
import { api, type Event } from "@/lib/api";

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
      return `Created in ${String(d.columnTitle ?? "?")}`;
    case "card.moved":
      return `Moved ${String(d.fromColumnTitle ?? "?")} → ${String(d.toColumnTitle ?? "?")}`;
    case "card.renamed":
      return `Renamed "${String(d.from ?? "")}" → "${String(d.to ?? "")}"`;
    case "card.description_changed":
      return `Description ${String(d.fromLength ?? "?")} → ${String(d.toLength ?? "?")} chars`;
    case "card.deleted":
      return `Deleted from ${String(d.lastColumnTitle ?? "?")}`;
    default:
      return e.type;
  }
}

type Props = {
  projectId: string;
  cardId: string;
};

export function CardActivity({ projectId, cardId }: Props) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setError(null);
    api
      .cardHistory(projectId, cardId)
      .then((evs) => {
        if (!cancelled) setEvents(evs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, cardId]);

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Activity</div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      {!error && events === null && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}
      {!error && events?.length === 0 && (
        <div className="text-sm text-muted-foreground">No activity yet.</div>
      )}
      {!error && events && events.length > 0 && (
        <ul className="grid gap-1.5 text-sm max-h-48 overflow-y-auto pr-1">
          {events.map((e) => (
            <li key={e.id} className="grid grid-cols-[1fr_auto] gap-2">
              <span>{summarize(e)}</span>
              <span
                className="text-muted-foreground tabular-nums"
                title={e.at}
              >
                {relative(e.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
