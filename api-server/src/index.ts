import app from "./app";
import { logger } from "./lib/logger";
import { initScheduler } from "./lib/scheduler";
import { db, runsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function cleanupStaleRuns(): Promise<void> {
  const result = await db
    .update(runsTable)
    .set({ status: "cancelled", finishedAt: new Date(), logLines: "Run was interrupted by a server restart." })
    .where(eq(runsTable.status, "running"))
    .returning({ id: runsTable.id });

  if (result.length > 0) {
    logger.warn({ runIds: result.map((r) => r.id) }, "Marked stale running runs as cancelled on startup");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  cleanupStaleRuns()
    .then(() => initScheduler())
    .catch((e) => logger.error({ err: e }, "Startup init failed"));
});
