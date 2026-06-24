import { db, settingsTable } from "@workspace/db";

export async function ensureSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(settingsTable).values({}).returning();
  return created;
}

export async function getSettings() {
  return ensureSettings();
}
