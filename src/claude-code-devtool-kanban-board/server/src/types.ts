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

export type Database = {
  projects: Project[];
  boards: Record<string, Board>;
  events: Event[];
};
