import { Router, type IRouter } from "express";
import { createRequire } from "node:module";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import {
  GetResumeResponse,
  UpdateResumeBody,
  UpdateResumeResponse,
  ExtractResumeSkillsBody,
  ExtractResumeSkillsResponse,
  MergeResumeExperienceBody,
  MergeResumeExperienceResponse,
} from "@workspace/api-zod";
import { getResume, upsertResume } from "../lib/resumeService";
import { db, resumeTable } from "@workspace/db";

const _require = createRequire(import.meta.url);
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = _require("pdf-parse");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/resume", async (_req, res): Promise<void> => {
  const row = await getResume();
  res.json(
    GetResumeResponse.parse({
      content: row.content,
      updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
      skills: row.skills ?? null,
      additionalExperience: row.additionalExperience ?? null,
    })
  );
});

router.put("/resume", async (req, res): Promise<void> => {
  const body = UpdateResumeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updated = await upsertResume({
    content: body.data.content,
    skills: body.data.skills ?? undefined,
    additionalExperience: body.data.additionalExperience ?? undefined,
  });
  res.json(
    UpdateResumeResponse.parse({
      content: updated.content,
      updatedAt: updated.updatedAt.toISOString(),
      skills: updated.skills ?? null,
      additionalExperience: updated.additionalExperience ?? null,
    })
  );
});

// Extract text from a PDF and return it (does NOT save). Frontend pipes this into Step 1.
router.post("/resume/extract-pdf", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }

  if (req.file.mimetype !== "application/pdf") {
    res.status(400).json({ error: "Only PDF files are accepted." });
    return;
  }

  try {
    const parsed = await pdfParse(req.file.buffer);
    const text = parsed.text?.trim();

    if (!text || text.length < 50) {
      res.status(422).json({
        error: "Could not extract readable text from this PDF. Try pasting your resume manually.",
      });
      return;
    }

    res.json({ text, charCount: text.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF parsing failed";
    res.status(500).json({ error: msg });
  }
});

// AI distills raw resume text into a clean structured candidate profile suitable for scoring.
router.post("/resume/process", async (req, res): Promise<void> => {
  const { rawInput } = req.body as { rawInput?: string };

  if (!rawInput || rawInput.trim().length < 50) {
    res.status(400).json({ error: "Please provide at least a paragraph of resume content." });
    return;
  }

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      temperature: 0.1,
      system: `You are a resume parser and writer. You will receive raw resume text — possibly extracted from a PDF (which often has weird spacing, line breaks, and formatting artifacts), or pasted from a doc. Your job is to produce a clean, well-organized markdown resume that an AI job-scoring system can read accurately.

Output a clean markdown resume with these sections (only include sections that have content):

# Name
**One-line tagline / current title**

## Summary
2-4 sentences about the candidate's background, expertise, and what they bring.

## Experience
For each role, in reverse chronological order:
### Job Title — Company (start year–end year or Present)
- Key accomplishment with numbers when available
- Another accomplishment
- (3–6 bullets per role)

## Skills
Group related skills together (e.g. "CRM: Salesforce, HubSpot" or "Sales methodologies: MEDDIC, Challenger")

## Education
**Degree** — Institution (year)

## Certifications (only if any)

Rules:
- Preserve every concrete fact: company names, role titles, dates, numbers, percentages, dollar amounts
- Fix obvious PDF extraction artifacts (broken words, weird line breaks, page numbers, header/footer noise)
- Do NOT invent or embellish anything not in the source
- Do NOT include contact info (phone, email, address) — strip it out for privacy
- Use clean markdown only — no HTML, no decorative emojis
- If the input is sparse or hard to parse, do your best with what's there`,
      messages: [
        {
          role: "user",
          content: `Here is the raw resume text. Please clean it up into a structured markdown resume:\n\n${rawInput.trim()}`,
        },
      ],
    });

    const processed = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    if (!processed) {
      res.status(500).json({ error: "AI did not return a usable response. Please try again." });
      return;
    }

    res.json({ processed, charCount: processed.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI processing failed";
    res.status(500).json({ error: msg });
  }
});

// Extract skills from resume content using AI — does NOT save to DB.
router.post("/resume/extract-skills", async (req, res): Promise<void> => {
  const body = ExtractResumeSkillsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { resumeContent } = body.data;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0,
      system: `You are a resume skills extractor. Given a resume, extract all skills and group them into meaningful categories. Return a JSON array of objects with "category" and "skills" fields. Categories should be concise labels like "CRM", "Sales Methodology", "Leadership", "Tools", "Languages", etc. Each skill should be a short string (1-4 words). Only return valid JSON — no prose, no markdown code fences.`,
      messages: [
        {
          role: "user",
          content: `Extract skills from this resume and return JSON:\n\n${resumeContent.trim()}`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";

    let skills: Array<{ category: string; skills: string[] }> = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        skills = parsed
          .filter(
            (item): item is { category: string; skills: unknown[] } =>
              typeof item === "object" &&
              item !== null &&
              typeof item.category === "string" &&
              Array.isArray(item.skills)
          )
          .map((item) => ({
            category: item.category,
            skills: item.skills.filter((s): s is string => typeof s === "string"),
          }))
          .filter((item) => item.skills.length > 0);
      }
    } catch {
      skills = [];
    }

    res.json(ExtractResumeSkillsResponse.parse({ skills }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI skill extraction failed";
    res.status(500).json({ error: msg });
  }
});

// AI merges new experience into the existing resume at the chronologically correct position.
router.post("/resume/merge-experience", async (req, res): Promise<void> => {
  const body = MergeResumeExperienceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { currentResume, newExperience } = body.data;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      temperature: 0.1,
      system: `You are a resume editor. Given an existing resume in markdown format and a new role, project, or achievement to add, insert the new content into the correct chronological position in the Experience section. Preserve the existing markdown structure and formatting exactly. Only return the full updated resume markdown — no explanations, no code fences.`,
      messages: [
        {
          role: "user",
          content: `Here is the existing resume:\n\n${currentResume.trim()}\n\n---\n\nHere is the new experience to merge in:\n\n${newExperience.trim()}`,
        },
      ],
    });

    const updatedResume = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    if (!updatedResume) {
      res.status(500).json({ error: "AI did not return a usable response. Please try again." });
      return;
    }

    res.json(MergeResumeExperienceResponse.parse({ updatedResume }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI merge failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
