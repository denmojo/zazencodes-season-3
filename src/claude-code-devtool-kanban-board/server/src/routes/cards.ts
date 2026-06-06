import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mutateBoard } from "../db.js";

export const cardsRouter = Router({ mergeParams: true });

type Params = { projectId: string };

cardsRouter.post("/", async (req, res) => {
  const { projectId } = req.params as unknown as Params;
  const columnId = String(req.body?.columnId ?? "");
  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "");
  if (!columnId || !title) {
    return res.status(400).json({ error: "columnId and title are required" });
  }

  const result = await mutateBoard(projectId, (board, emit) => {
    const column = board.columns.find((c) => c.id === columnId);
    if (!column) return null;
    const order = board.cards.filter((c) => c.columnId === columnId).length;
    const now = new Date().toISOString();
    const num = board.nextTicket;
    board.nextTicket = num + 1;
    const created = {
      id: randomUUID(),
      number: num,
      columnId,
      title,
      description,
      order,
      createdAt: now,
      updatedAt: now,
    };
    board.cards.push(created);
    emit("card.created", {
      cardId: created.id,
      columnId,
      data: { title, columnTitle: column.title },
    });
    return created;
  });
  if (result === null) return res.status(404).json({ error: "project not found" });
  if (!result) return res.status(400).json({ error: "column not found" });
  res.status(201).json(result);
});

cardsRouter.patch("/:id", async (req, res) => {
  const { projectId, id } = req.params as unknown as Params & { id: string };
  const updated = await mutateBoard(projectId, (board, emit) => {
    const card = board.cards.find((c) => c.id === id);
    if (!card) return null;
    let mutated = false;

    if (typeof req.body?.title === "string" && req.body.title.trim()) {
      const next = req.body.title.trim();
      if (next !== card.title) {
        emit("card.renamed", {
          cardId: card.id,
          data: { from: card.title, to: next },
        });
        card.title = next;
        mutated = true;
      }
    }
    if (typeof req.body?.description === "string") {
      const next = req.body.description;
      if (next !== card.description) {
        emit("card.description_changed", {
          cardId: card.id,
          data: { fromLength: card.description.length, toLength: next.length },
        });
        card.description = next;
        mutated = true;
      }
    }
    if (typeof req.body?.columnId === "string" && req.body.columnId !== card.columnId) {
      const newCol = board.columns.find((c) => c.id === req.body.columnId);
      if (newCol) {
        const oldColumnId = card.columnId;
        const oldCol = board.columns.find((c) => c.id === oldColumnId);
        emit("card.moved", {
          cardId: card.id,
          columnId: newCol.id,
          data: {
            fromColumnId: oldColumnId,
            toColumnId: newCol.id,
            fromColumnTitle: oldCol?.title ?? null,
            toColumnTitle: newCol.title,
          },
        });
        card.columnId = req.body.columnId;
        if (typeof req.body?.order !== "number") {
          card.order = board.cards.filter(
            (c) => c.columnId === card.columnId && c.id !== card.id,
          ).length;
        }
        board.cards
          .filter((c) => c.columnId === oldColumnId)
          .sort((a, b) => a.order - b.order)
          .forEach((c, i) => (c.order = i));
        mutated = true;
      }
    }
    if (typeof req.body?.order === "number") {
      card.order = req.body.order;
    }
    if (mutated) card.updatedAt = new Date().toISOString();
    return card;
  });
  if (updated === null) return res.status(404).json({ error: "project not found" });
  if (!updated) return res.status(404).json({ error: "card not found" });
  res.json(updated);
});

cardsRouter.delete("/:id", async (req, res) => {
  const { projectId, id } = req.params as unknown as Params & { id: string };
  const ok = await mutateBoard(projectId, (board, emit) => {
    const idx = board.cards.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const removed = board.cards[idx];
    const lastCol = board.columns.find((c) => c.id === removed.columnId);
    emit("card.deleted", {
      cardId: removed.id,
      columnId: removed.columnId,
      data: {
        title: removed.title,
        lastColumnId: removed.columnId,
        lastColumnTitle: lastCol?.title ?? null,
      },
    });
    board.cards.splice(idx, 1);
    board.cards
      .filter((c) => c.columnId === removed.columnId)
      .sort((a, b) => a.order - b.order)
      .forEach((c, i) => (c.order = i));
    return true;
  });
  if (ok === null) return res.status(404).json({ error: "project not found" });
  if (!ok) return res.status(404).json({ error: "card not found" });
  res.status(204).end();
});
