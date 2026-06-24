import { eq } from "drizzle-orm";
import { db, jobsTable, runsTable, settingsTable } from "@workspace/db";
import { logger } from "./logger";
import { fetchJSearch, fetchAdzuna, dedupeJobs } from "./jobFetcher";
import { scoreJob, detectWorkLocationType, getThresholdForLocationType } from "./scoring";
import { tailorJob } from "./tailor";
import { getSettings } from "./settingsService";
import { getResume } from "./resumeService";
import { registerRun, isCancelled, clearCancel } from "./cancellation";

async function checkCancelled(runId: number, logs: string[]): Promise<boolean> {
  if (isCancelled(runId)) {
    logs.push(`[${new Date().toISOString()}] Run cancelled by user.`);
    await db.update(runsTable).set({
      status: "cancelled",
      finishedAt: new Date(),
      logLines: logs.join("\n"),
    }).where(eq(runsTable.id, runId));
    clearCancel(runId);
    return true;
  }
  return false;
}

export async function startRun(runId: number): Promise<void> {
  const signal = registerRun(runId);
  const logs: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    logs.push(line);
    logger.info(msg);
  };

  try {
    log("Starting job search run...");

    const settings = await getSettings();
    const resumeRow = await getResume();
    const masterResume = resumeRow.content;
    const resumeSkills = resumeRow.skills ?? null;

    const queries = settings.searchQueries.split("\n").map((q) => q.trim()).filter(Boolean);

    let locations: string[];
    try {
      const parsed = JSON.parse(settings.locationCities);
      locations = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      locations = [];
    }
    if (locations.length === 0) {
      locations = settings.locations.split("\n").map((l) => l.trim()).filter(Boolean);
    }

    const employmentTypes = settings.employmentTypeFilter.split(",").map((t) => t.trim()).filter(Boolean);
    const candidateContext = settings.candidateContext ?? "";
    const coverLetterContext = settings.coverLetterContext ?? "";

    log(`Search queries: ${queries.join(", ")}`);
    log(`Locations: ${locations.join(", ")} (radius: ${settings.locationRadiusMiles} miles)`);
    log(`Employment types: ${employmentTypes.join(", ")}`);
    if (candidateContext) log(`Candidate context: provided (${candidateContext.length} chars)`);

    // Step 1: Fetch jobs — check for cancellation between each individual fetch
    log("Step 1: Fetching jobs from job boards...");

    const hasRapidApi = !!process.env.RAPIDAPI_KEY;
    const hasAdzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

    if (!hasRapidApi) log("ERROR: RAPIDAPI_KEY not set — JSearch skipped. Add it to your .env to enable JSearch job fetching.");
    if (!hasAdzuna) log("ERROR: ADZUNA_APP_ID or ADZUNA_APP_KEY not set — Adzuna skipped. Add them to your .env to enable Adzuna job fetching.");
    if (!hasAnthropicKey) {
      log("ERROR: ANTHROPIC_API_KEY not set — scoring and tailoring will fail. Add it to your .env.");
      await finishRun(runId, { jobsFetched: 0, jobsScored: 0, jobsTailored: 0, logs });
      return;
    }

    const allRaw = [];

    for (const query of queries) {
      for (const location of locations) {
        if (await checkCancelled(runId, logs)) return;

        if (hasRapidApi) {
          log(`  Fetching JSearch: "${query}" in ${location}`);
          const jsJobs = await fetchJSearch(query, location, employmentTypes, settings.jsearchDatePosted, settings.jsearchPages);
          allRaw.push(...jsJobs);
          log(`  JSearch returned ${jsJobs.length} jobs`);
        }

        if (await checkCancelled(runId, logs)) return;

        if (hasAdzuna) {
          log(`  Fetching Adzuna: "${query}" in ${location}`);
          const azJobs = await fetchAdzuna(query, location, settings.adzunaPages);
          allRaw.push(...azJobs);
          log(`  Adzuna returned ${azJobs.length} jobs`);
        }
      }
    }

    const unique = dedupeJobs(allRaw);
    log(`Total unique jobs fetched: ${unique.length}`);

    if (await checkCancelled(runId, logs)) return;

    // Step 2: Skip already-seen jobs
    const existing = await db.select({ jobId: jobsTable.jobId }).from(jobsTable);
    const seenIds = new Set(existing.map((r) => r.jobId));
    const newJobs = unique.filter((j) => !seenIds.has(j.jobId));
    log(`New jobs (not seen before): ${newJobs.length}`);

    // Update fetched count
    await db.update(runsTable).set({ jobsFetched: unique.length }).where(eq(runsTable.id, runId));

    if (newJobs.length === 0) {
      log("No new jobs to process.");
      await finishRun(runId, { jobsFetched: unique.length, jobsScored: 0, jobsTailored: 0, logs });
      return;
    }

    // Step 3: Score each job
    log(`Step 2: Scoring ${newJobs.length} new jobs with Claude Sonnet...`);
    let scored = 0;
    let tailored = 0;
    let skippedByLocation = 0;

    for (const raw of newJobs) {
      // Check for cancellation before each job
      if (await checkCancelled(runId, logs)) return;

      const locationType = detectWorkLocationType(raw.isRemote, raw.location, raw.jobDescription);

      // Skip job before scoring if its work location type is disabled in settings
      const locationEnabled =
        (locationType === "remote" && settings.includeRemote) ||
        (locationType === "hybrid" && settings.includeHybrid) ||
        (locationType === "onsite" && settings.includeOnsite);

      if (!locationEnabled) {
        log(`  Skipping (${locationType} jobs disabled in settings): ${raw.title} at ${raw.company}`);
        skippedByLocation++;
        continue;
      }

      log(`  Scoring: ${raw.title} at ${raw.company}`);

      const scoreResult = await scoreJob(
        masterResume,
        raw.title,
        raw.company,
        raw.location,
        raw.isRemote,
        raw.employmentType,
        raw.jobDescription,
        candidateContext,
        1,
        resumeSkills,
        signal
      );

      log(`  Score: ${scoreResult.score} — ${scoreResult.scoreRationale.slice(0, 80)}...`);
      scored++;

      // Check for cancellation between score and tailor
      if (await checkCancelled(runId, logs)) return;

      const threshold = getThresholdForLocationType(
        locationType,
        settings.scoreThresholdRemote,
        settings.scoreThresholdHybrid,
        settings.scoreThresholdOnsite
      );

      log(`  Work type: ${locationType}, threshold: ${threshold}`);

      let tailoredResume: string | null = null;
      let coverLetter: string | null = null;
      let topKeywords: string | null = null;
      let status = scoreResult.score >= threshold ? "Scored" : "Below threshold";

      if (scoreResult.score >= threshold) {
        log(`  Score above threshold (${threshold}), tailoring...`);

        const fakeJob = {
          id: 0,
          jobId: raw.jobId,
          title: raw.title,
          company: raw.company,
          location: raw.location,
          employmentType: raw.employmentType,
          isRemote: raw.isRemote,
          workLocationType: locationType,
          salary: raw.salary,
          fitScore: scoreResult.score,
          scoreRationale: scoreResult.scoreRationale,
          mustHaveMatches: scoreResult.mustHaveMatches.join("; "),
          gaps: scoreResult.gaps.join("; "),
          redFlags: scoreResult.redFlags.join("; "),
          status,
          applyUrl: raw.applyUrl,
          jobDescription: raw.jobDescription,
          tailoredResume: null,
          coverLetter: null,
          topKeywords: null,
          notes: null,
          source: raw.source,
          createdAt: new Date(),
          appliedAt: null,
        };

        const tailorResult = await tailorJob(fakeJob, masterResume, threshold, coverLetterContext, 1, resumeSkills, signal);
        tailoredResume = tailorResult.tailoredResume;
        coverLetter = tailorResult.coverLetter;
        topKeywords = tailorResult.topKeywords;

        if (tailoredResume) {
          status = "Tailored";
          tailored++;
          log(`  Tailoring complete.`);
        } else {
          status = "Scored";
          log(`  Tailoring failed, marked as Scored.`);
        }
      }

      // Insert into DB
      await db.insert(jobsTable).values({
        jobId: raw.jobId,
        title: raw.title,
        company: raw.company,
        location: raw.location,
        employmentType: raw.employmentType,
        isRemote: raw.isRemote,
        workLocationType: locationType,
        salary: raw.salary,
        fitScore: scoreResult.score,
        scoreRationale: scoreResult.scoreRationale,
        mustHaveMatches: scoreResult.mustHaveMatches.join("; "),
        gaps: scoreResult.gaps.join("; "),
        redFlags: scoreResult.redFlags.join("; "),
        status,
        applyUrl: raw.applyUrl,
        jobDescription: raw.jobDescription,
        tailoredResume,
        coverLetter,
        topKeywords,
        source: raw.source,
      }).onConflictDoNothing();

      // Persist logs incrementally so live polling shows progress
      await db.update(runsTable).set({
        jobsScored: scored,
        jobsTailored: tailored,
        logLines: logs.join("\n"),
      }).where(eq(runsTable.id, runId));
    }

    if (await checkCancelled(runId, logs)) return;

    // Update settings.lastRunAt
    const [s] = await db.select().from(settingsTable).limit(1);
    if (s) {
      await db.update(settingsTable).set({ lastRunAt: new Date() }).where(eq(settingsTable.id, s.id));
    }

    log(`Summary: ${unique.length} fetched, ${newJobs.length} new, ${skippedByLocation} skipped by location filter, ${scored} scored, ${tailored} tailored.`);
    await finishRun(runId, { jobsFetched: unique.length, jobsScored: scored, jobsTailored: tailored, logs });
  } catch (err) {
    // If the abort signal fired, mark as cancelled rather than failed
    if (isCancelled(runId) || (err instanceof Error && err.name === "AbortError")) {
      const line = `[${new Date().toISOString()}] Run cancelled by user.`;
      logs.push(line);
      await db.update(runsTable).set({
        status: "cancelled",
        finishedAt: new Date(),
        logLines: logs.join("\n"),
      }).where(eq(runsTable.id, runId));
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "Run failed");
      logs.push(`[ERROR] ${msg}`);
      await db.update(runsTable).set({
        status: "failed",
        finishedAt: new Date(),
        errorMessage: msg,
        logLines: logs.join("\n"),
      }).where(eq(runsTable.id, runId));
    }
  } finally {
    clearCancel(runId);
  }
}

async function finishRun(
  runId: number,
  result: { jobsFetched: number; jobsScored: number; jobsTailored: number; logs: string[] }
) {
  await db.update(runsTable).set({
    status: "completed",
    finishedAt: new Date(),
    jobsFetched: result.jobsFetched,
    jobsScored: result.jobsScored,
    jobsTailored: result.jobsTailored,
    logLines: result.logs.join("\n"),
  }).where(eq(runsTable.id, runId));
}
