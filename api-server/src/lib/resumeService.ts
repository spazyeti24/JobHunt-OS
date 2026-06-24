import { eq } from "drizzle-orm";
import { db, resumeTable } from "@workspace/db";

const DEFAULT_RESUME = `# Your Name
**Account Manager | Strategic Partnerships | Customer Success**

📧 your.email@example.com | 📞 (555) 000-0000 | LinkedIn: linkedin.com/in/yourname | Location: Austin, TX

---

## Summary

Results-driven Account Manager with 7+ years of experience managing enterprise accounts, driving revenue growth, and building long-term client relationships. Proven track record of exceeding quota, expanding accounts, and translating complex solutions into client value.

---

## Experience

### Senior Account Manager — Acme Corp (2020–Present)
- Managed portfolio of 35 enterprise accounts totaling $8.2M ARR
- Achieved 127% of quota in FY2023 through strategic upselling and new logo acquisition
- Reduced churn by 18% via proactive QBR program and executive stakeholder alignment
- Led cross-functional teams (CS, Product, Legal) to close 3 multi-year contracts >$500K each

### Account Manager — Beta Solutions (2017–2020)
- Grew mid-market book of business from $1.2M to $3.4M ARR over 3 years
- Negotiated and closed 40+ new contracts ranging from $25K–$200K
- Maintained 94% net retention rate across 60-account portfolio
- Collaborated with SDRs to source and qualify pipeline, contributing 30% of personal new business

---

## Skills
- CRM: Salesforce, HubSpot, Gainsight
- Sales methodologies: MEDDIC, Challenger, SPIN
- Account planning, QBR facilitation, executive presentations
- Contract negotiation, renewal management, expansion selling
- Cross-functional collaboration, project management

---

## Education
**B.S. Business Administration** — University of Texas at Austin (2017)
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
