export type Column = {
  id: string;
  title: string;
  order: number;
};

export type Card = {
  id: string;
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
};

export type Project = {
  id: string;
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
