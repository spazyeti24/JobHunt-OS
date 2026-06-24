import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";
import { formatSkillsBlock } from "./skillsFormat";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ScoreResult {
  score: number;
  scoreRationale: string;
  mustHaveMatches: string[];
  gaps: string[];
  redFlags: string[];
}

export function detectWorkLocationType(
  isRemote: boolean,
  location: string,
  description: string
): "remote" | "hybrid" | "onsite" {
  if (isRemote) return "remote";

  const text = `${location} ${description}`.toLowerCase();
  if (text.includes("hybrid")) return "hybrid";
  if (
    text.includes("on-site") ||
    text.includes("onsite") ||
    text.includes("in-office") ||
    text.includes("in office") ||
    text.includes("on site")
  )
    return "onsite";

  return "onsite";
}

export function getThresholdForLocationType(
  locationType: "remote" | "hybrid" | "onsite",
  thresholdRemote: number,
  thresholdHybrid: number,
  thresholdOnsite: number
): number {
  if (locationType === "remote") return thresholdRemote;
  if (locationType === "hybrid") return thresholdHybrid;
  return thresholdOnsite;
}

export async function scoreJob(
  masterResume: string,
  jobTitle: string,
  company: string,
  location: string,
  isRemote: boolean,
  employmentType: string,
  jobDescription: string,
  candidateContext = "",
  attempt = 1,
  skills: string | null = null,
  signal?: AbortSignal
): Promise<ScoreResult> {
  const contextBlock =
    candidateContext.trim().length > 0
      ? `\nADDITIONAL CANDIDATE PREFERENCES (consider these when scoring fit):\n${candidateContext.trim()}\n`
      : "";

  const rawSkills = formatSkillsBlock(skills);
  const skillsSection = rawSkills.length > 0
    ? `\nCANDIDATE STRUCTURED SKILLS (use these exact tags when identifying must_have_matches and gaps):\n${rawSkills}\n`
    : "";

  const skillsInstruction = rawSkills.length > 0
    ? "\nWhen listing must_have_matches and gaps, reference the candidate's exact skill tags from the structured skills list above. Each bullet should name the specific skill tag and whether it was found in the job description."
    : "";

  const prompt = `Evaluate fit between this candidate and this job.

CANDIDATE RESUME (Markdown):
<<<
${masterResume}
>>>${skillsSection}${contextBlock}

JOB POSTING:
Title: ${jobTitle}
Company: ${company}
Location: ${location} (remote: ${isRemote})
Employment type: ${employmentType}
Description:
<<<
${jobDescription.slice(0, 6000)}
>>>

Return JSON exactly in this shape:
{
  "score": <integer 0-100>,
  "score_rationale": "<2-3 sentences, specific to this candidate and this job>",
  "must_have_matches": ["<short bullet>"],
  "gaps": ["<short bullet>"],
  "red_flags": ["<e.g. requires security clearance / on-site only / unrealistic experience>"]
}
${skillsInstruction}
Scoring rubric:
- 90-100: near-perfect match, candidate exceeds requirements
- 75-89: strong match, minor gaps
- 60-74: decent match, several gaps but worth applying
- 40-59: weak match, would be a stretch
- 0-39: poor fit, do not apply
Be honest. Do not inflate scores.`;

  try {
    const msg = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        temperature: 0,
        system:
          `You are an expert hiring fit evaluator. Assess how well this candidate fits the role of ${jobTitle} at ${company}, based on their resume and the job description. You return ONLY valid JSON, no prose, no markdown fences.`,
        messages: [{ role: "user", content: prompt }],
      },
      { signal }
    );

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(text);

    return {
      score: parsed.score ?? 0,
      scoreRationale: parsed.score_rationale ?? "",
      mustHaveMatches: parsed.must_have_matches ?? [],
      gaps: parsed.gaps ?? [],
      redFlags: parsed.red_flags ?? [],
    };
  } catch (err) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw err;
    }
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return scoreJob(
        masterResume,
        jobTitle,
        company,
        location,
        isRemote,
        employmentType,
        jobDescription,
        candidateContext,
        attempt + 1,
        skills,
        signal
      );
    }
    if (err instanceof Error && err.message.includes("API key")) {
      logger.error("ANTHROPIC_API_KEY is invalid or missing — scoring cannot proceed.");
    } else {
      logger.error({ err }, "Scoring failed after retries");
    }
    return {
      score: 0,
      scoreRationale: "Score failed due to API error. Check ANTHROPIC_API_KEY in your .env.",
      mustHaveMatches: [],
      gaps: [],
      redFlags: [],
    };
  }
}
