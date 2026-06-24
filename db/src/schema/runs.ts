import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const runsTable = pgTable("runs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  jobsFetched: integer("jobs_fetched"),
  jobsScored: integer("jobs_scored"),
  jobsTailored: integer("jobs_tailored"),
  errorMessage: text("error_message"),
  logLines: text("log_lines"),
});

export const insertRunSchema = createInsertSchema(runsTable).omit({ id: true, startedAt: true });
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Run = typeof runsTable.$inferSelect;
