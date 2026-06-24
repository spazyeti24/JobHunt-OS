import { pgTable, serial, text, integer, boolean, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull().default(""),
  employmentType: text("employment_type").notNull().default("FULLTIME"),
  isRemote: boolean("is_remote").notNull().default(false),
  workLocationType: text("work_location_type").notNull().default("onsite"),
  salary: text("salary"),
  fitScore: integer("fit_score").notNull().default(0),
  scoreRationale: text("score_rationale"),
  mustHaveMatches: text("must_have_matches"),
  gaps: text("gaps"),
  redFlags: text("red_flags"),
  status: text("status").notNull().default("Scored"),
  applyUrl: text("apply_url"),
  jobDescription: text("job_description"),
  tailoredResume: text("tailored_resume"),
  coverLetter: text("cover_letter"),
  topKeywords: text("top_keywords"),
  notes: text("notes"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  appliedAt: timestamp("applied_at"),
}, (table) => [
  check("work_location_type_check", sql`${table.workLocationType} IN ('remote', 'hybrid', 'onsite')`),
]);

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
