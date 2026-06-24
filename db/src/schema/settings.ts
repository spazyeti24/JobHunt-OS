import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  scoreThreshold: integer("score_threshold").notNull().default(70),
  scoreThresholdRemote: integer("score_threshold_remote").notNull().default(75),
  scoreThresholdHybrid: integer("score_threshold_hybrid").notNull().default(82),
  scoreThresholdOnsite: integer("score_threshold_onsite").notNull().default(90),
  minSalary: integer("min_salary").notNull().default(0),
  employmentTypeFilter: text("employment_type_filter").notNull().default("FULLTIME,CONTRACTOR"),
  remoteOnly: boolean("remote_only").notNull().default(false),
  includeRemote: boolean("include_remote").notNull().default(true),
  includeHybrid: boolean("include_hybrid").notNull().default(true),
  includeOnsite: boolean("include_onsite").notNull().default(true),
  searchQueries: text("search_queries").notNull().default("Account Manager\nSenior Account Manager\nStrategic Account Manager\nCustomer Success Manager"),
  locations: text("locations").notNull().default("Austin, TX\nRemote, US"),
  locationCities: text("location_cities").notNull().default('["Salt Lake City, UT"]'),
  locationRadiusMiles: integer("location_radius_miles").notNull().default(25),
  candidateContext: text("candidate_context").notNull().default(""),
  coverLetterContext: text("cover_letter_context").notNull().default(""),
  lastRunAt: timestamp("last_run_at"),
  recurringEnabled: boolean("recurring_enabled").notNull().default(false),
  scheduleTime: text("schedule_time").notNull().default("08:00"),
  scheduleFrequencyDays: integer("schedule_frequency_days").notNull().default(1),
  jsearchDatePosted: text("jsearch_date_posted").notNull().default("week"),
  jsearchPages: integer("jsearch_pages").notNull().default(2),
  adzunaPages: integer("adzuna_pages").notNull().default(2),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
