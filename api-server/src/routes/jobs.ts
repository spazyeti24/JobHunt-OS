import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql, inArray } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import {
  ListJobsQueryParams,
  ListJobsResponse,
  GetJobParams,
  GetJobResponse,
  UpdateJobParams,
  UpdateJobBody,
  UpdateJobResponse,
  DeleteJobParams,
  RetailorJobParams,
  RetailorJobResponse,
  GetJobStatsResponse,
  RescoreFailedJobsResponse,
  GetRescoreProgressResponse,
  RescoreJobsByRangeBody,
} from "@workspace/api-zod";
import { tailorJob } from "../lib/tailor";
import { scoreJob, detectWorkLocationType, getThresholdForLocationType } from "../lib/scoring";
import { getSettings } from "../lib/settingsService";
import { getResume } from "../lib/resumeService";
import { serializeJob, serializeJobs } from "../lib/serialize";
import { tryStartRescoreProgress, incrementRescoreProgress, finishRescoreProgress, getRescoreProgress, requestCancelRescore, isCancelRequested } from "../lib/rescoreProgress";

const router: IRouter = Router();

router.get("/jobs/stats", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(jobsTable);
  const visible = jobs.filter((j) => j.status !== "Hidden");
  const total = visible.length;
  const tailored = visible.filter((j) => j.tailoredResume).length;
  const applied = visible.filter((j) => j.status === "Applied").length;
  const scores = visible.map((j) => j.fitScore);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const highFit = visible.filter((j) => j.fitScore >= 80).length;
  const failedScoring = jobs.filter((j) => j.scoreRationale === "Score failed due to API error.").length;

  const statusCounts: Record<string, number> = {};
  for (const j of visible) {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  }
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  res.json(
    GetJobStatsResponse.parse({
      total,
      tailored,
      applied,
      avgScore: Math.round(avgScore * 10) / 10,
      highFit,
      failedScoring,
      byStatus,
    })
  );
});

const FAILED_SCORE_RATIONALE = "Score failed due to API error.";

router.get("/jobs/rescore-failed/progress", (_req, res): void => {
  res.json(GetRescoreProgressResponse.parse(getRescoreProgress()));
});

router.post("/jobs/rescore-failed", async (req, res): Promise<void> => {
  const failedJobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.scoreRationale, FAILED_SCORE_RATIONALE));

  const attempted = failedJobs.length;
  let succeeded = 0;
  let failed = 0;
  let completed = 0;

  if (attempted === 0) {
    res.json(RescoreFailedJobsResponse.parse({ attempted: 0, succeeded: 0, failed: 0 }));
    return;
  }

  const resumeRow = await getResume();
  const settings = await getSettings();
  const masterResume = resumeRow.content;
  const resumeSkills = resumeRow.skills ?? null;
  const candidateContext = settings.candidateContext ?? "";

  if (!tryStartRescoreProgress(attempted)) {
    res.status(409).json({ error: "A rescore is already in progress." });
    return;
  }

  let canceled = false;
  try {
    for (const job of failedJobs) {
      if (isCancelRequested()) {
        canceled = true;
        break;
      }
      try {
        const scoreResult = await scoreJob(
          masterResume,
          job.title,
          job.company,
          job.location,
          job.isRemote,
          job.employmentType,
          job.jobDescription ?? "",
          candidateContext,
          1,
          resumeSkills
        );

        if (scoreResult.scoreRationale === FAILED_SCORE_RATIONALE) {
          failed++;
          continue;
        }

        const locationType = detectWorkLocationType(job.isRemote, job.location, job.jobDescription ?? "");
        const threshold = getThresholdForLocationType(
          locationType,
          settings.scoreThresholdRemote,
          settings.scoreThresholdHybrid,
          settings.scoreThresholdOnsite
        );

        // Determine new status:
        // - Preserve "Tailored" if the job already has a tailored resume and scores above threshold
        // - Otherwise "Scored" if above threshold, "Below threshold" if not
        let newStatus: string;
        if (scoreResult.score >= threshold) {
          newStatus = job.tailoredResume ? "Tailored" : "Scored";
        } else {
          newStatus = "Below threshold";
        }

        await db
          .update(jobsTable)
          .set({
            fitScore: scoreResult.score,
            scoreRationale: scoreResult.scoreRationale,
            mustHaveMatches: scoreResult.mustHaveMatches.join("; "),
            gaps: scoreResult.gaps.join("; "),
            redFlags: scoreResult.redFlags.join("; "),
            status: newStatus,
          })
          .where(eq(jobsTable.id, job.id));

        succeeded++;
      } catch {
        failed++;
      }
      completed++;
      incrementRescoreProgress();
    }
  } finally {
    finishRescoreProgress();
  }

  req.log.info({ attempted, succeeded, failed, completed, canceled }, "Rescore failed jobs complete");
  res.json(RescoreFailedJobsResponse.parse({ attempted, succeeded, failed, canceled }));
});

router.post("/jobs/rescore-range", async (req, res): Promise<void> => {
  const body = RescoreJobsByRangeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { minScore, maxScore } = body.data;

  if (minScore > maxScore) {
    res.status(400).json({ error: "minScore must be less than or equal to maxScore" });
    return;
  }

  const jobsToRescore = await db
    .select()
    .from(jobsTable)
    .where(and(gte(jobsTable.fitScore, minScore), lte(jobsTable.fitScore, maxScore)));

  const attempted = jobsToRescore.length;
  let completed = 0;

  if (attempted === 0) {
    res.json(RescoreFailedJobsResponse.parse({ attempted: 0, succeeded: 0, failed: 0 }));
    return;
  }

  if (!tryStartRescoreProgress(attempted)) {
    res.status(409).json({ error: "A rescore is already in progress." });
    return;
  }

  const resumeRow = await getResume();
  const settings = await getSettings();
  const masterResume = resumeRow.content;
  const resumeSkills = resumeRow.skills ?? null;
  const candidateContext = settings.candidateContext ?? "";

  let succeeded = 0;
  let failed = 0;
  let canceled = false;

  try {
    for (const job of jobsToRescore) {
      if (isCancelRequested()) {
        canceled = true;
        break;
      }
      try {
        const scoreResult = await scoreJob(
          masterResume,
          job.title,
          job.company,
          job.location,
          job.isRemote,
          job.employmentType,
          job.jobDescription ?? "",
          candidateContext,
          1,
          resumeSkills
        );

        if (scoreResult.scoreRationale === FAILED_SCORE_RATIONALE) {
          failed++;
          continue;
        }

        const locationType = detectWorkLocationType(job.isRemote, job.location, job.jobDescription ?? "");
        const threshold = getThresholdForLocationType(
          locationType,
          settings.scoreThresholdRemote,
          settings.scoreThresholdHybrid,
          settings.scoreThresholdOnsite
        );

        let newStatus: string;
        if (scoreResult.score >= threshold) {
          newStatus = job.tailoredResume ? "Tailored" : "Scored";
        } else {
          newStatus = "Below threshold";
        }

        await db
          .update(jobsTable)
          .set({
            fitScore: scoreResult.score,
            scoreRationale: scoreResult.scoreRationale,
            mustHaveMatches: scoreResult.mustHaveMatches.join("; "),
            gaps: scoreResult.gaps.join("; "),
            redFlags: scoreResult.redFlags.join("; "),
            status: newStatus,
          })
          .where(eq(jobsTable.id, job.id));

        succeeded++;
      } catch {
        failed++;
      }
      completed++;
      incrementRescoreProgress();
    }
  } finally {
    finishRescoreProgress();
  }

  req.log.info({ minScore, maxScore, attempted, succeeded, failed, completed, canceled }, "Rescore by range complete");
  res.json(RescoreFailedJobsResponse.parse({ attempted, succeeded, failed, canceled }));
});

router.post("/jobs/rescore/cancel", (req, res): void => {
  const progress = getRescoreProgress();
  if (!progress.isRunning) {
    res.status(409).json({ error: "No rescore is currently running." });
    return;
  }
  requestCancelRescore();
  req.log.info("Rescore cancellation requested");
  res.json({ message: "Cancel requested" });
});

router.delete("/jobs", async (req, res): Promise<void> => {
  await db.delete(jobsTable);
  req.log.info("All jobs cleared");
  res.sendStatus(204);
});

router.get("/jobs", async (req, res): Promise<void> => {
  // The generated client serializes arrays via .toString() → comma-separated string.
  // Normalize it back to a proper array before Zod validation.
  const rawQuery: Record<string, unknown> = { ...req.query };
  if (typeof rawQuery.locationTypes === "string") {
    rawQuery.locationTypes = rawQuery.locationTypes.split(",").filter(Boolean);
  }
  if (typeof rawQuery.statuses === "string") {
    rawQuery.statuses = rawQuery.statuses.split(",").filter(Boolean);
  }

  const query = ListJobsQueryParams.safeParse(rawQuery);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { minScore, status, employmentType, locationTypes, statuses, search } = query.data;

  // Explicit empty array means "show nothing" — treat same as locationTypes.
  if (locationTypes !== undefined && locationTypes.length === 0) {
    res.json(ListJobsResponse.parse([]));
    return;
  }
  if (statuses !== undefined && statuses.length === 0) {
    res.json(ListJobsResponse.parse([]));
    return;
  }

  const conditions = [];
  if (minScore != null) conditions.push(gte(jobsTable.fitScore, minScore));
  if (status) conditions.push(eq(jobsTable.status, status));
  if (statuses && statuses.length > 0) conditions.push(inArray(jobsTable.status, statuses));
  if (employmentType) conditions.push(eq(jobsTable.employmentType, employmentType));
  if (locationTypes && locationTypes.length > 0) conditions.push(inArray(jobsTable.workLocationType, locationTypes));
  if (search) {
    conditions.push(
      or(
        ilike(jobsTable.title, `%${search}%`),
        ilike(jobsTable.company, `%${search}%`)
      )
    );
  }

  const jobs =
    conditions.length > 0
      ? await db
          .select()
          .from(jobsTable)
          .where(and(...conditions))
          .orderBy(sql`${jobsTable.fitScore} desc`)
      : await db.select().from(jobsTable).orderBy(sql`${jobsTable.fitScore} desc`);

  res.json(ListJobsResponse.parse(serializeJobs(jobs)));
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetJobParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(GetJobResponse.parse(serializeJob(job)));
});

router.patch("/jobs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateJobParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateJobBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof jobsTable.$inferInsert> = {};
  if (body.data.status != null) {
    updates.status = body.data.status;
    if (body.data.status === "Applied") {
      updates.appliedAt = new Date();
    }
  }
  if (body.data.notes != null) updates.notes = body.data.notes;

  const [job] = await db
    .update(jobsTable)
    .set(updates)
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(UpdateJobResponse.parse(serializeJob(job)));
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteJobParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .update(jobsTable)
    .set({ status: "Hidden" })
    .where(eq(jobsTable.id, params.data.id));

  res.sendStatus(204);
});

router.post("/jobs/:id/retailor", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RetailorJobParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const resumeRow = await getResume();
  const settings = await getSettings();

  const tailored = await tailorJob(job, resumeRow.content, settings.scoreThreshold, "", 1, resumeRow.skills ?? null);

  const [updated] = await db
    .update(jobsTable)
    .set({
      tailoredResume: tailored.tailoredResume,
      coverLetter: tailored.coverLetter,
      topKeywords: tailored.topKeywords,
      status: tailored.tailoredResume ? "Tailored" : job.status,
    })
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  res.json(RetailorJobResponse.parse(serializeJob(updated)));
});

export default router;
