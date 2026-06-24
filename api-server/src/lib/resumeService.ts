import { eq } from "drizzle-orm";
import { db, resumeTable } from "@workspace/db";

const DEFAULT_RESUME = `# No resume uploaded yet

**Upload your resume on the Master Resume page to get started.**

Go to Master Resume in the sidebar and either paste your resume in Markdown format or upload a PDF. All AI scoring and tailoring will use this document as the source of truth.
`;

export async function getResume() {
  const [row] = await db.select().from(resumeTable).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(resumeTable)
    .values({ content: DEFAULT_RESUME })
    .returning();
  return created;
}

export async function getResumeContent(): Promise<string> {
  const row = await getResume();
  return row.content;
}

export async function upsertResume(data: {
  content?: string;
  skills?: string | null;
  additionalExperience?: string | null;
}) {
  const [existing] = await db.select().from(resumeTable).limit(1);
  if (existing) {
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (data.content !== undefined) updateSet.content = data.content;
    if (data.skills !== undefined) updateSet.skills = data.skills;
    if (data.additionalExperience !== undefined) updateSet.additionalExperience = data.additionalExperience;

    const [updated] = await db
      .update(resumeTable)
      .set(updateSet)
      .where(eq(resumeTable.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(resumeTable)
    .values({ content: data.content ?? DEFAULT_RESUME, skills: data.skills, additionalExperience: data.additionalExperience })
    .returning();
  return created;
}
