import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import type { Settings } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";
import { getSettings, ensureSettings } from "../lib/settingsService";
import { applySchedule } from "../lib/scheduler";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function serializeSettings(s: Settings) {
  return {
    ...s,
    lastRunAt: s.lastRunAt instanceof Date ? s.lastRunAt.toISOString() : s.lastRunAt,
  };
}

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json(GetSettingsResponse.parse(serializeSettings(settings)));
});

const VALID_FREQUENCY_DAYS = [1, 2, 7];
const SCHEDULE_TIME_RE = /^\d{2}:\d{2}$/;

router.patch("/settings", async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.scheduleTime != null && !SCHEDULE_TIME_RE.test(body.data.scheduleTime)) {
    res.status(400).json({ error: "scheduleTime must be in HH:mm format (e.g. '08:00')" });
    return;
  }

  if (body.data.scheduleFrequencyDays != null && !VALID_FREQUENCY_DAYS.includes(body.data.scheduleFrequencyDays)) {
    res.status(400).json({ error: "scheduleFrequencyDays must be 1, 2, or 7" });
    return;
  }

  const current = await ensureSettings();

  const updates: Partial<typeof settingsTable.$inferInsert> = {};
  if (body.data.scoreThreshold != null) updates.scoreThreshold = body.data.scoreThreshold;
  if (body.data.scoreThresholdRemote != null) updates.scoreThresholdRemote = body.data.scoreThresholdRemote;
  if (body.data.scoreThresholdHybrid != null) updates.scoreThresholdHybrid = body.data.scoreThresholdHybrid;
  if (body.data.scoreThresholdOnsite != null) updates.scoreThresholdOnsite = body.data.scoreThresholdOnsite;
  if (body.data.minSalary != null) updates.minSalary = body.data.minSalary;
  if (body.data.employmentTypeFilter != null) updates.employmentTypeFilter = body.data.employmentTypeFilter;
  if (body.data.remoteOnly != null) updates.remoteOnly = body.data.remoteOnly;
  if (body.data.includeRemote != null) updates.includeRemote = body.data.includeRemote;
  if (body.data.includeHybrid != null) updates.includeHybrid = body.data.includeHybrid;
  if (body.data.includeOnsite != null) updates.includeOnsite = body.data.includeOnsite;
  if (body.data.searchQueries != null) updates.searchQueries = body.data.searchQueries;
  if (body.data.locations != null) updates.locations = body.data.locations;
  if (body.data.locationCities != null) updates.locationCities = body.data.locationCities;
  if (body.data.locationRadiusMiles != null) updates.locationRadiusMiles = body.data.locationRadiusMiles;
  if (body.data.candidateContext != null) updates.candidateContext = body.data.candidateContext;
  if (body.data.coverLetterContext != null) updates.coverLetterContext = body.data.coverLetterContext;
  if (body.data.recurringEnabled != null) updates.recurringEnabled = body.data.recurringEnabled;
  if (body.data.scheduleTime != null) updates.scheduleTime = body.data.scheduleTime;
  if (body.data.scheduleFrequencyDays != null) updates.scheduleFrequencyDays = body.data.scheduleFrequencyDays;
  if (body.data.jsearchDatePosted != null) updates.jsearchDatePosted = body.data.jsearchDatePosted;
  if (body.data.jsearchPages != null) updates.jsearchPages = body.data.jsearchPages;
  if (body.data.adzunaPages != null) updates.adzunaPages = body.data.adzunaPages;

  const [updated] = await db
    .update(settingsTable)
    .set(updates)
    .where(eq(settingsTable.id, current.id))
    .returning();

  applySchedule(
    updated.recurringEnabled,
    updated.scheduleTime,
    updated.scheduleFrequencyDays
  );

  res.json(UpdateSettingsResponse.parse(serializeSettings(updated)));
});

router.post("/settings/process-cover-letter", async (req, res): Promise<void> => {
  const { rawInput } = req.body as { rawInput?: string };

  if (!rawInput || rawInput.trim().length < 10) {
    res.status(400).json({ error: "Please provide at least a sentence describing your cover letter style." });
    return;
  }

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0.2,
      system: `You are a professional writing coach. A job seeker will describe how they want their cover letters written — possibly casual, incomplete, or stream-of-consciousness. Your job is to produce a clean, structured cover letter style guide that will be used to instruct an AI writing system when generating cover letters for job applications.

Output a clear, well-organized style guide in second-person covering:
- Tone and voice (e.g. "You prefer a warm but professional tone, never stiff or corporate")
- Opening approach (e.g. "You avoid clichés like 'I am writing to apply'. Lead with a specific hook about the company or role.")
- Structure preferences (e.g. "Three paragraphs max. No bullet points in the letter itself.")
- Content priorities (e.g. "Emphasize relationship-building and revenue expansion, not just account management")
- Things to avoid (e.g. "Don't mention salary. Don't sound desperate.")
- Closing style (e.g. "End with a specific ask for a conversation, not a generic 'I look forward to hearing from you'")
- Any personal style quirks or pet peeves mentioned

Be factual and concise. Do not add details not present in the input. Output plain text only — no markdown headers, no decorative bullets. Use simple line breaks between topics.`,
      messages: [
        {
          role: "user",
          content: `Here is how I want my cover letters written:\n\n${rawInput.trim()}`,
        },
      ],
    });

    const processed = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    if (!processed) {
      res.status(500).json({ error: "AI did not return a usable response. Please try again." });
      return;
    }

    res.json({ processed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI processing failed";
    res.status(500).json({ error: msg });
  }
});

router.post("/settings/process-context", async (req, res): Promise<void> => {
  const { rawInput } = req.body as { rawInput?: string };

  if (!rawInput || rawInput.trim().length < 10) {
    res.status(400).json({ error: "Please provide at least a sentence describing what you're looking for." });
    return;
  }

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0.2,
      system: `You are a career advisor assistant. A job seeker will describe what they're looking for in their next role in their own words — possibly casual, incomplete, or stream-of-consciousness. Your job is to read their input and produce a clean, structured candidate preference profile that will be used to guide an AI job scoring system.

Output a clear, well-organized summary in second-person ("You are looking for...") covering:
- Target role type and seniority
- Preferred industries or company types
- Company size preference (if mentioned)
- Work style preferences (remote, hybrid, on-site, travel)
- Compensation expectations (if mentioned)
- Things to avoid / deal-breakers
- Career goals or growth desires
- Any other strong preferences mentioned

Be factual and concise. Do not add details not present in the input. If something wasn't mentioned, omit that section. Output plain text only — no markdown headers, no bullet symbols that look decorative. Use simple line breaks between topics.`,
      messages: [
        {
          role: "user",
          content: `Here is what I'm looking for in my next job:\n\n${rawInput.trim()}`,
        },
      ],
    });

    const processed = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    if (!processed) {
      res.status(500).json({ error: "AI did not return a usable response. Please try again." });
      return;
    }

    res.json({ processed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI processing failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
