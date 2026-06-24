import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, runsTable } from "@workspace/db";
import type { Run } from "@workspace/db";
import {
  ListRunsResponse,
  GetRunParams,
  GetRunResponse,
} from "@workspace/api-zod";
import { startRun } from "../lib/runner";
import { requestCancel } from "../lib/cancellation";
import { getNextRunAt } from "../lib/scheduler";

function serializeRun(run: Run) {
  return {
    ...run,
    startedAt: run.startedAt instanceof Date ? run.startedAt.toISOString() : run.startedAt,
    finishedAt: run.finishedAt instanceof Date ? run.finishedAt.toISOString() : run.finishedAt,
  };
}

const router: IRouter = Router();

router.get("/runs/schedule", async (_req, res): Promise<void> => {
  const nextRunAt = getNextRunAt();
  res.json({ nextRunAt: nextRunAt ? nextRunAt.toISOString() : null });
});

router.get("/runs", async (_req, res): Promise<void> => {
  const runs = await db.select().from(runsTable).orderBy(desc(runsTable.startedAt)).limit(50);
  res.json(ListRunsResponse.parse(runs.map(serializeRun)));
});

router.post("/runs", async (req, res): Promise<void> => {
  const [run] = await db
    .insert(runsTable)
    .values({ status: "running" })
    .returning();

  startRun(run.id).catch(() => {});

  res.status(202).json({
    message: "Run started — check back in a few minutes.",
    runId: run.id,
  });
});

router.get("/runs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetRunParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [run] = await db.select().from(runsTable).where(eq(runsTable.id, params.data.id));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  res.json(GetRunResponse.parse(serializeRun(run)));
});

router.post("/runs/:id/cancel", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid run ID" });
    return;
  }

  const [run] = await db.select().from(runsTable).where(eq(runsTable.id, id));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  if (run.status !== "running") {
    res.status(409).json({ error: `Run is not in progress (status: ${run.status})` });
    return;
  }

  requestCancel(id);
  res.json({ message: "Cancellation requested" });
});

export default router;
