export type Column = {
  id: string;
  title: string;
  order: number;
};

export type Card = {
  id: string;
  number: number;            // per-project monotonic ticket number; display id = `${slug}-${number}`
  columnId: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  columns: Column[];
  cards: Card[];
  nextTicket: number;        // next ticket number to assign on this board (starts at 1)
};

export type Project = {
  id: string;
  slug: string;              // unique human id; URL identifier + ticket prefix; immutable
  name: string;
  createdAt: string;
  completedAt: string | null;
};

export type EventType =
  | "card.created"
  | "card.moved"
  | "card.renamed"
  | "card.description_changed"
  | "card.deleted"
  | "column.created"
  | "column.renamed"
  | "column.moved"
  | "column.deleted"
  | "project.created"
  | "project.renamed"
  | "project.completed"
  | "project.reopened"
  | "project.deleted";

export type Event = {
  id: string;
  at: string;
  projectId: string;
  type: EventType;
  cardId?: string;
  columnId?: string;
  data: Record<string, unknown>;
};

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (name: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameProject: (id: string, name: string) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteProject: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),
  completeProject: (id: string) =>
    request<Project>(`/api/projects/${id}/complete`, { method: "POST" }),
  reopenProject: (id: string) =>
    request<Project>(`/api/projects/${id}/reopen`, { method: "POST" }),

  getBoard: (projectId: string) =>
    request<Board>(`/api/projects/${projectId}/board`),
  createColumn: (projectId: string, title: string, position?: number) =>
    request<Column>(`/api/projects/${projectId}/columns`, {
      method: "POST",
      body: JSON.stringify(
        position === undefined ? { title } : { title, position },
      ),
    }),
  updateColumn: (
    projectId: string,
    id: string,
    patch: { title?: string; order?: number },
  ) =>
    request<Column>(`/api/projects/${projectId}/columns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteColumn: (projectId: string, id: string) =>
    request<void>(`/api/projects/${projectId}/columns/${id}`, {
      method: "DELETE",
    }),
  createCard: (
    projectId: string,
    columnId: string,
    title: string,
    description: string,
  ) =>
    request<Card>(`/api/projects/${projectId}/cards`, {
      method: "POST",
      body: JSON.stringify({ columnId, title, description }),
    }),
  updateCard: (
    projectId: string,
    id: string,
    patch: Partial<Pick<Card, "title" | "description" | "columnId" | "order">>,
  ) =>
    request<Card>(`/api/projects/${projectId}/cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteCard: (projectId: string, id: string) =>
    request<void>(`/api/projects/${projectId}/cards/${id}`, {
      method: "DELETE",
    }),
  cardHistory: (projectId: string, cardId: string) =>
    request<Event[]>(`/api/projects/${projectId}/cards/${cardId}/history`),
  projectHistory: (
    projectId: string,
    opts: { cardId?: string; type?: string; since?: string; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (opts.cardId) q.set("cardId", opts.cardId);
    if (opts.type) q.set("type", opts.type);
    if (opts.since) q.set("since", opts.since);
    if (opts.limit !== undefined) q.set("limit", String(opts.limit));
    const qs = q.toString();
    return request<Event[]>(
      `/api/projects/${projectId}/history${qs ? `?${qs}` : ""}`,
    );
  },
};
