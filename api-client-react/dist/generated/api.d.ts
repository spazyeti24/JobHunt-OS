import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { CancelRescoreResult, CancelRunResult, ExtractSkillsInput, ExtractSkillsResult, HealthStatus, Job, JobStats, JobUpdate, ListJobsParams, MergeExperienceInput, MergeExperienceResult, RescoreFailedResult, RescoreProgress, RescoreRangeBody, Resume, ResumeInput, Run, RunSchedule, RunTriggerResult, Settings, SettingsUpdate } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all jobs
 */
export declare const getListJobsUrl: (params?: ListJobsParams) => string;
export declare const listJobs: (params?: ListJobsParams, options?: RequestInit) => Promise<Job[]>;
export declare const getListJobsQueryKey: (params?: ListJobsParams) => readonly ["/api/jobs", ...ListJobsParams[]];
export declare const getListJobsQueryOptions: <TData = Awaited<ReturnType<typeof listJobs>>, TError = ErrorType<unknown>>(params?: ListJobsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListJobsQueryResult = NonNullable<Awaited<ReturnType<typeof listJobs>>>;
export type ListJobsQueryError = ErrorType<unknown>;
/**
 * @summary List all jobs
 */
export declare function useListJobs<TData = Awaited<ReturnType<typeof listJobs>>, TError = ErrorType<unknown>>(params?: ListJobsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete all jobs
 */
export declare const getDeleteAllJobsUrl: () => string;
export declare const deleteAllJobs: (options?: RequestInit) => Promise<void>;
export declare const getDeleteAllJobsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAllJobs>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAllJobs>>, TError, void, TContext>;
export type DeleteAllJobsMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAllJobs>>>;
export type DeleteAllJobsMutationError = ErrorType<unknown>;
/**
 * @summary Delete all jobs
 */
export declare const useDeleteAllJobs: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAllJobs>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAllJobs>>, TError, void, TContext>;
/**
 * @summary Get a single job
 */
export declare const getGetJobUrl: (id: number) => string;
export declare const getJob: (id: number, options?: RequestInit) => Promise<Job>;
export declare const getGetJobQueryKey: (id: number) => readonly [`/api/jobs/${number}`];
export declare const getGetJobQueryOptions: <TData = Awaited<ReturnType<typeof getJob>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getJob>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getJob>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetJobQueryResult = NonNullable<Awaited<ReturnType<typeof getJob>>>;
export type GetJobQueryError = ErrorType<void>;
/**
 * @summary Get a single job
 */
export declare function useGetJob<TData = Awaited<ReturnType<typeof getJob>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getJob>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update job status or notes
 */
export declare const getUpdateJobUrl: (id: number) => string;
export declare const updateJob: (id: number, jobUpdate: JobUpdate, options?: RequestInit) => Promise<Job>;
export declare const getUpdateJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateJob>>, TError, {
        id: number;
        data: BodyType<JobUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateJob>>, TError, {
    id: number;
    data: BodyType<JobUpdate>;
}, TContext>;
export type UpdateJobMutationResult = NonNullable<Awaited<ReturnType<typeof updateJob>>>;
export type UpdateJobMutationBody = BodyType<JobUpdate>;
export type UpdateJobMutationError = ErrorType<unknown>;
/**
 * @summary Update job status or notes
 */
export declare const useUpdateJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateJob>>, TError, {
        id: number;
        data: BodyType<JobUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateJob>>, TError, {
    id: number;
    data: BodyType<JobUpdate>;
}, TContext>;
/**
 * @summary Delete (hide) a job
 */
export declare const getDeleteJobUrl: (id: number) => string;
export declare const deleteJob: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteJob>>, TError, {
    id: number;
}, TContext>;
export type DeleteJobMutationResult = NonNullable<Awaited<ReturnType<typeof deleteJob>>>;
export type DeleteJobMutationError = ErrorType<unknown>;
/**
 * @summary Delete (hide) a job
 */
export declare const useDeleteJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteJob>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Re-tailor a job's resume and cover letter
 */
export declare const getRetailorJobUrl: (id: number) => string;
export declare const retailorJob: (id: number, options?: RequestInit) => Promise<Job>;
export declare const getRetailorJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof retailorJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof retailorJob>>, TError, {
    id: number;
}, TContext>;
export type RetailorJobMutationResult = NonNullable<Awaited<ReturnType<typeof retailorJob>>>;
export type RetailorJobMutationError = ErrorType<unknown>;
/**
 * @summary Re-tailor a job's resume and cover letter
 */
export declare const useRetailorJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof retailorJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof retailorJob>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get aggregate stats for dashboard
 */
export declare const getGetJobStatsUrl: () => string;
export declare const getJobStats: (options?: RequestInit) => Promise<JobStats>;
export declare const getGetJobStatsQueryKey: () => readonly ["/api/jobs/stats"];
export declare const getGetJobStatsQueryOptions: <TData = Awaited<ReturnType<typeof getJobStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getJobStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getJobStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetJobStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getJobStats>>>;
export type GetJobStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get aggregate stats for dashboard
 */
export declare function useGetJobStats<TData = Awaited<ReturnType<typeof getJobStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getJobStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Re-score all jobs that failed scoring due to API errors
 */
export declare const getRescoreFailedJobsUrl: () => string;
export declare const rescoreFailedJobs: (options?: RequestInit) => Promise<RescoreFailedResult>;
export declare const getRescoreFailedJobsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rescoreFailedJobs>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof rescoreFailedJobs>>, TError, void, TContext>;
export type RescoreFailedJobsMutationResult = NonNullable<Awaited<ReturnType<typeof rescoreFailedJobs>>>;
export type RescoreFailedJobsMutationError = ErrorType<unknown>;
/**
 * @summary Re-score all jobs that failed scoring due to API errors
 */
export declare const useRescoreFailedJobs: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rescoreFailedJobs>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof rescoreFailedJobs>>, TError, void, TContext>;
/**
 * @summary Re-score all jobs whose fit score falls within a given range
 */
export declare const getRescoreJobsByRangeUrl: () => string;
export declare const rescoreJobsByRange: (rescoreRangeBody: RescoreRangeBody, options?: RequestInit) => Promise<RescoreFailedResult>;
export declare const getRescoreJobsByRangeMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rescoreJobsByRange>>, TError, {
        data: BodyType<RescoreRangeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof rescoreJobsByRange>>, TError, {
    data: BodyType<RescoreRangeBody>;
}, TContext>;
export type RescoreJobsByRangeMutationResult = NonNullable<Awaited<ReturnType<typeof rescoreJobsByRange>>>;
export type RescoreJobsByRangeMutationBody = BodyType<RescoreRangeBody>;
export type RescoreJobsByRangeMutationError = ErrorType<void>;
/**
 * @summary Re-score all jobs whose fit score falls within a given range
 */
export declare const useRescoreJobsByRange: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rescoreJobsByRange>>, TError, {
        data: BodyType<RescoreRangeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof rescoreJobsByRange>>, TError, {
    data: BodyType<RescoreRangeBody>;
}, TContext>;
/**
 * @summary Cancel an in-progress rescore operation
 */
export declare const getCancelRescoreUrl: () => string;
export declare const cancelRescore: (options?: RequestInit) => Promise<CancelRescoreResult>;
export declare const getCancelRescoreMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelRescore>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof cancelRescore>>, TError, void, TContext>;
export type CancelRescoreMutationResult = NonNullable<Awaited<ReturnType<typeof cancelRescore>>>;
export type CancelRescoreMutationError = ErrorType<void>;
/**
 * @summary Cancel an in-progress rescore operation
 */
export declare const useCancelRescore: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelRescore>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof cancelRescore>>, TError, void, TContext>;
/**
 * @summary Get the current progress of an in-progress rescore operation
 */
export declare const getGetRescoreProgressUrl: () => string;
export declare const getRescoreProgress: (options?: RequestInit) => Promise<RescoreProgress>;
export declare const getGetRescoreProgressQueryKey: () => readonly ["/api/jobs/rescore-failed/progress"];
export declare const getGetRescoreProgressQueryOptions: <TData = Awaited<ReturnType<typeof getRescoreProgress>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRescoreProgress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRescoreProgress>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRescoreProgressQueryResult = NonNullable<Awaited<ReturnType<typeof getRescoreProgress>>>;
export type GetRescoreProgressQueryError = ErrorType<unknown>;
/**
 * @summary Get the current progress of an in-progress rescore operation
 */
export declare function useGetRescoreProgress<TData = Awaited<ReturnType<typeof getRescoreProgress>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRescoreProgress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get current settings
 */
export declare const getGetSettingsUrl: () => string;
export declare const getSettings: (options?: RequestInit) => Promise<Settings>;
export declare const getGetSettingsQueryKey: () => readonly ["/api/settings"];
export declare const getGetSettingsQueryOptions: <TData = Awaited<ReturnType<typeof getSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof getSettings>>>;
export type GetSettingsQueryError = ErrorType<unknown>;
/**
 * @summary Get current settings
 */
export declare function useGetSettings<TData = Awaited<ReturnType<typeof getSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update settings
 */
export declare const getUpdateSettingsUrl: () => string;
export declare const updateSettings: (settingsUpdate: SettingsUpdate, options?: RequestInit) => Promise<Settings>;
export declare const getUpdateSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
        data: BodyType<SettingsUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
    data: BodyType<SettingsUpdate>;
}, TContext>;
export type UpdateSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateSettings>>>;
export type UpdateSettingsMutationBody = BodyType<SettingsUpdate>;
export type UpdateSettingsMutationError = ErrorType<unknown>;
/**
 * @summary Update settings
 */
export declare const useUpdateSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
        data: BodyType<SettingsUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSettings>>, TError, {
    data: BodyType<SettingsUpdate>;
}, TContext>;
/**
 * @summary Get master resume markdown
 */
export declare const getGetResumeUrl: () => string;
export declare const getResume: (options?: RequestInit) => Promise<Resume>;
export declare const getGetResumeQueryKey: () => readonly ["/api/resume"];
export declare const getGetResumeQueryOptions: <TData = Awaited<ReturnType<typeof getResume>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getResume>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getResume>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetResumeQueryResult = NonNullable<Awaited<ReturnType<typeof getResume>>>;
export type GetResumeQueryError = ErrorType<unknown>;
/**
 * @summary Get master resume markdown
 */
export declare function useGetResume<TData = Awaited<ReturnType<typeof getResume>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getResume>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update master resume
 */
export declare const getUpdateResumeUrl: () => string;
export declare const updateResume: (resumeInput: ResumeInput, options?: RequestInit) => Promise<Resume>;
export declare const getUpdateResumeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateResume>>, TError, {
        data: BodyType<ResumeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateResume>>, TError, {
    data: BodyType<ResumeInput>;
}, TContext>;
export type UpdateResumeMutationResult = NonNullable<Awaited<ReturnType<typeof updateResume>>>;
export type UpdateResumeMutationBody = BodyType<ResumeInput>;
export type UpdateResumeMutationError = ErrorType<unknown>;
/**
 * @summary Update master resume
 */
export declare const useUpdateResume: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateResume>>, TError, {
        data: BodyType<ResumeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateResume>>, TError, {
    data: BodyType<ResumeInput>;
}, TContext>;
/**
 * @summary Extract skills from resume using AI
 */
export declare const getExtractResumeSkillsUrl: () => string;
export declare const extractResumeSkills: (extractSkillsInput: ExtractSkillsInput, options?: RequestInit) => Promise<ExtractSkillsResult>;
export declare const getExtractResumeSkillsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof extractResumeSkills>>, TError, {
        data: BodyType<ExtractSkillsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof extractResumeSkills>>, TError, {
    data: BodyType<ExtractSkillsInput>;
}, TContext>;
export type ExtractResumeSkillsMutationResult = NonNullable<Awaited<ReturnType<typeof extractResumeSkills>>>;
export type ExtractResumeSkillsMutationBody = BodyType<ExtractSkillsInput>;
export type ExtractResumeSkillsMutationError = ErrorType<unknown>;
/**
 * @summary Extract skills from resume using AI
 */
export declare const useExtractResumeSkills: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof extractResumeSkills>>, TError, {
        data: BodyType<ExtractSkillsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof extractResumeSkills>>, TError, {
    data: BodyType<ExtractSkillsInput>;
}, TContext>;
/**
 * @summary Merge new experience into the resume using AI
 */
export declare const getMergeResumeExperienceUrl: () => string;
export declare const mergeResumeExperience: (mergeExperienceInput: MergeExperienceInput, options?: RequestInit) => Promise<MergeExperienceResult>;
export declare const getMergeResumeExperienceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof mergeResumeExperience>>, TError, {
        data: BodyType<MergeExperienceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof mergeResumeExperience>>, TError, {
    data: BodyType<MergeExperienceInput>;
}, TContext>;
export type MergeResumeExperienceMutationResult = NonNullable<Awaited<ReturnType<typeof mergeResumeExperience>>>;
export type MergeResumeExperienceMutationBody = BodyType<MergeExperienceInput>;
export type MergeResumeExperienceMutationError = ErrorType<unknown>;
/**
 * @summary Merge new experience into the resume using AI
 */
export declare const useMergeResumeExperience: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof mergeResumeExperience>>, TError, {
        data: BodyType<MergeExperienceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof mergeResumeExperience>>, TError, {
    data: BodyType<MergeExperienceInput>;
}, TContext>;
/**
 * @summary List recent run logs
 */
export declare const getListRunsUrl: () => string;
export declare const listRuns: (options?: RequestInit) => Promise<Run[]>;
export declare const getListRunsQueryKey: () => readonly ["/api/runs"];
export declare const getListRunsQueryOptions: <TData = Awaited<ReturnType<typeof listRuns>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRuns>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRuns>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRunsQueryResult = NonNullable<Awaited<ReturnType<typeof listRuns>>>;
export type ListRunsQueryError = ErrorType<unknown>;
/**
 * @summary List recent run logs
 */
export declare function useListRuns<TData = Awaited<ReturnType<typeof listRuns>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRuns>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Trigger an immediate job search run
 */
export declare const getTriggerRunUrl: () => string;
export declare const triggerRun: (options?: RequestInit) => Promise<RunTriggerResult>;
export declare const getTriggerRunMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerRun>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof triggerRun>>, TError, void, TContext>;
export type TriggerRunMutationResult = NonNullable<Awaited<ReturnType<typeof triggerRun>>>;
export type TriggerRunMutationError = ErrorType<unknown>;
/**
 * @summary Trigger an immediate job search run
 */
export declare const useTriggerRun: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerRun>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof triggerRun>>, TError, void, TContext>;
/**
 * @summary Get the next scheduled run time
 */
export declare const getGetRunScheduleUrl: () => string;
export declare const getRunSchedule: (options?: RequestInit) => Promise<RunSchedule>;
export declare const getGetRunScheduleQueryKey: () => readonly ["/api/runs/schedule"];
export declare const getGetRunScheduleQueryOptions: <TData = Awaited<ReturnType<typeof getRunSchedule>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRunSchedule>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRunSchedule>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRunScheduleQueryResult = NonNullable<Awaited<ReturnType<typeof getRunSchedule>>>;
export type GetRunScheduleQueryError = ErrorType<unknown>;
/**
 * @summary Get the next scheduled run time
 */
export declare function useGetRunSchedule<TData = Awaited<ReturnType<typeof getRunSchedule>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRunSchedule>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a run log by ID
 */
export declare const getGetRunUrl: (id: number) => string;
export declare const getRun: (id: number, options?: RequestInit) => Promise<Run>;
export declare const getGetRunQueryKey: (id: number) => readonly [`/api/runs/${number}`];
export declare const getGetRunQueryOptions: <TData = Awaited<ReturnType<typeof getRun>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRun>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRun>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRunQueryResult = NonNullable<Awaited<ReturnType<typeof getRun>>>;
export type GetRunQueryError = ErrorType<unknown>;
/**
 * @summary Get a run log by ID
 */
export declare function useGetRun<TData = Awaited<ReturnType<typeof getRun>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRun>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Cancel an in-progress run
 */
export declare const getCancelRunUrl: (id: number) => string;
export declare const cancelRun: (id: number, options?: RequestInit) => Promise<CancelRunResult>;
export declare const getCancelRunMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelRun>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof cancelRun>>, TError, {
    id: number;
}, TContext>;
export type CancelRunMutationResult = NonNullable<Awaited<ReturnType<typeof cancelRun>>>;
export type CancelRunMutationError = ErrorType<void>;
/**
 * @summary Cancel an in-progress run
 */
export declare const useCancelRun: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelRun>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof cancelRun>>, TError, {
    id: number;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map