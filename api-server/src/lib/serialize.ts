import type { Job } from "@workspace/db";

export function serializeJob(job: Job) {
  return {
    ...job,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
    appliedAt: job.appliedAt instanceof Date ? job.appliedAt.toISOString() : job.appliedAt,
  };
}

export function serializeJobs(jobs: Job[]) {
  return jobs.map(serializeJob);
}
