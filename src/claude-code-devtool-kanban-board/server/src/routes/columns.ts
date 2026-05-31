import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mutateBoard } from "../db.js";

export const columnsRouter = Router({ mergeParams: true });

type Params = { projectId: string };

columnsRouter.post("/", async (req, res) => {
  const { projectId } = req.params as unknown as Params;
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });

  // Optional 0-based insertion point. Omitted = append to the end (legacy behavior).
  const rawPosition = req.body?.position;
  let position: number | undefined;
  if (rawPosition !== undefined && rawPosition !== null) {
    position = Number(rawPosition);
    if (!Number.isInteger(position) || position < 0) {
      return res
        .status(400)
        .json({ error: "position must be a non-negative integer" });
    }
  }

  const result = await mutateBoard(projectId, (board, emit) => {
    // Clamp an explicit position into [0, length]; default appends at the end.
    const order =
      position === undefined
        ? board.columns.length
        : Math.min(position, board.columns.length);
    // Make room: shift every column at or after the insertion point right by one.
    // Cards reference columns by id, never by order, so nothing detaches.
    for (const c of board.columns) {
      if (c.order >= order) c.order += 1;
    }
    const col = { id: randomUUID(), title, order };
    board.columns.push(col);
    emit("column.created", {
      columnId: col.id,
      data: { title, position: order },
    });
    return col;
  });
  if (!result) return res.status(404).json({ error: "project not found" });
  res.status(201).json(result);
});

columnsRouter.patch("/:id", async (req, res) => {
  const { projectId, id } = req.params as unknown as Params & { id: string };

  // title is optional now; when present it must be a non-empty string.
  const hasTitle = req.body?.title !== undefined && req.body?.title !== null;
  let title: string | undefined;
  if (hasTitle) {
    if (typeof req.body.title !== "string" || !req.body.title.trim()) {
      return res.status(400).json({ error: "title must be a non-empty string" });
    }
    title = req.body.title.trim();
  }

  // order is optional; when present it must be a non-negative integer.
  const rawOrder = req.body?.order;
  let order: number | undefined;
  if (rawOrder !== undefined && rawOrder !== null) {
    order = Number(rawOrder);
    if (!Number.isInteger(order) || order < 0) {
      return res
        .status(400)
        .json({ error: "order must be a non-negative integer" });
    }
  }

  if (title === undefined && order === undefined) {
    return res.status(400).json({ error: "nothing to update" });
  }

  const updated = await mutateBoard(projectId, (board, emit) => {
    const col = board.columns.find((c) => c.id === id);
    if (!col) return null;

    if (title !== undefined && title !== col.title) {
      emit("column.renamed", {
        columnId: col.id,
        data: { from: col.title, to: title },
      });
      col.title = title;
    }

    if (order !== undefined) {
      // Move the column to `order` (clamped to the last slot) and reshuffle the
      // rest so orders stay a contiguous 0..n-1 sequence. Cards reference columns
      // by id, never by order, so none of them detach.
      const target = Math.min(order, board.columns.length - 1);
      const from = col.order;
      if (target !== from) {
        for (const c of board.columns) {
          if (c.id === col.id) continue;
          if (from < target && c.order > from && c.order <= target) c.order -= 1;
          else if (from > target && c.order >= target && c.order < from) c.order += 1;
        }
        col.order = target;
        emit("column.moved", {
          columnId: col.id,
          data: { from, to: target },
        });
      }
    }

    return col;
  });
  if (updated === null) return res.status(404).json({ error: "project not found" });
  if (!updated) return res.status(404).json({ error: "column not found" });
  res.json(updated);
});

columnsRouter.delete("/:id", async (req, res) => {
  const { projectId, id } = req.params as unknown as Params & { id: string };
  const ok = await mutateBoard(projectId, (board, emit) => {
    const idx = board.columns.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const removed = board.columns[idx];
    const cardCount = board.cards.filter((c) => c.columnId === id).length;
    emit("column.deleted", {
      columnId: removed.id,
      data: { title: removed.title, deletedCardCount: cardCount },
    });
    board.columns.splice(idx, 1);
    board.cards = board.cards.filter((card) => card.columnId !== id);
    board.columns
      .sort((a, b) => a.order - b.order)
      .forEach((c, i) => (c.order = i));
    return true;
  });
  if (ok === null) return res.status(404).json({ error: "project not found" });
  if (!ok) return res.status(404).json({ error: "column not found" });
  res.status(204).end();
});
