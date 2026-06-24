import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeTable = pgTable("resume", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  skills: text("skills"),
  additionalExperience: text("additional_experience"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertResumeSchema = createInsertSchema(resumeTable).omit({ id: true, updatedAt: true });
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumeTable.$inferSelect;
