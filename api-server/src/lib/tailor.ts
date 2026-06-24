import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";
import type { Job } from "@workspace/db";
import { formatSkillsBlock } from "./skillsFormat";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TailorResult {
  tailoredResume: string | null;
  coverLetter: string | null;
  topKeywords: string | null;
}

export async function tailorJob(
  job: Job,
  masterResume: string,
  scoreThreshold: number,
  coverLetterContext = "",
  attempt = 1,
  skills: string | null = null,
  signal?: AbortSignal
): Promise<TailorResult> {
  if (job.fitScore < scoreThreshold) {
    return { tailoredResume: null, coverLetter: null, topKeywords: null };
  }

  const coverLetterStyleBlock =
    coverLetterContext.trim().length > 0
      ? `\nCOVER LETTER STYLE GUIDE (follow these instructions when writing the cover letter):\n${coverLetterContext.trim()}\n`
      : "";

  const rawSkills = formatSkillsBlock(skills);
  const hasSkills = rawSkills.length > 0;
  const skillsSection = hasSkills
    ? `\nCANDIDATE STRUCTURED SKILLS (extracted tags — use these to populate the Skills Match section):\n${rawSkills}\n`
    : "";

  const skillsMatchInstruction = hasSkills
    ? `\n- After the Skills section, add a ## Skills Match section (2 columns of bullet points): left column lists job requirements matched by the candidate's tags above; right column lists any notable gaps. Keep each bullet to one short phrase. Use ONLY tags from the structured skills list above — do not invent new ones.`
    : "";

  const prompt = `Tailor this candidate's resume and write a cover letter for this specific job.

CANDIDATE MASTER RESUME (Markdown — the source of truth, do not invent anything not in here):
<<<
${masterResume}
>>>${skillsSection}${coverLetterStyleBlock}

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Description:
<<<
${(job.jobDescription ?? "").slice(0, 3000)}
>>>

Return JSON exactly in this shape:
{
  "tailored_resume_markdown": "<the full tailored resume in Markdown. Re-order bullets to put the most job-relevant ones first under each role. Swap generic verbs for stronger ones. Use language from the job description WHERE TRUE. Keep all dates, employers, and metrics exactly as in the source. Maximum 1 page equivalent.${skillsMatchInstruction}>",
  "cover_letter_markdown": "<a cover letter addressed to 'Hiring Team at ${job.company}'. Follow any style guide provided above. If no style guide, default to: three paragraphs, professional but warm, specific hook opening (no 'I am writing to apply'), two concrete mapping sentences in the middle, and a clear call-to-action close. No invented details.>",
  "top_keywords_used": ["<keyword>"],
  "summary_of_changes": "<2 sentences describing what was emphasized vs. the master resume>"
}`;

  const systemPrompt = hasSkills
    ? "You are an expert career coach who tailors Account Manager resumes and cover letters. You never invent achievements, metrics, employers, or dates. You preserve all factual content from the source resume and only re-order, re-phrase, and re-emphasize. You write in the candidate's own voice based on their resume. When structured skill tags are provided, you use them precisely to populate the Skills Match section — matching job requirements to the candidate's exact tagged skills and flagging genuine gaps. Output ONLY valid JSON, no prose, no markdown fences."
    : "You are an expert career coach who tailors Account Manager resumes and cover letters. You never invent achievements, metrics, employers, or dates. You preserve all factual content from the source resume and only re-order, re-phrase, and re-emphasize. You write in the candidate's own voice based on their resume. Output ONLY valid JSON, no prose, no markdown fences.";

  try {
    const msg = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        temperature: 0.4,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      },
      { signal }
    );

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(text);

    return {
      tailoredResume: parsed.tailored_resume_markdown ?? null,
      coverLetter: parsed.cover_letter_markdown ?? null,
      topKeywords: Array.isArray(parsed.top_keywords_used)
        ? parsed.top_keywords_used.join(", ")
        : null,
    };
  } catch (err) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw err;
    }
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return tailorJob(job, masterResume, scoreThreshold, coverLetterContext, attempt + 1, skills, signal);
    }
    logger.error({ err }, "Tailoring failed after retries");
    return { tailoredResume: null, coverLetter: null, topKeywords: null };
  }
}
