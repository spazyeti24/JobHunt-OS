import { useState } from "react";
import { useListJobs, useUpdateJob } from "@workspace/api-client-react";
import type { Job } from "@workspace/api-client-react";
import { JobDetailsModal } from "@/components/job-details-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ExternalLink } from "lucide-react";

const PIPELINE_STATUSES = ["Applied", "Interviewing", "Offer", "Rejected"] as const;

const STATUS_COLORS: Record<string, string> = {
  Applied: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  Interviewing: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Offer: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Rejected: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

export function AppliedPage() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const { data: jobs, isLoading, refetch } = useListJobs({
    statuses: PIPELINE_STATUSES as unknown as string[],
  });
  const updateJob = useUpdateJob();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStatusChange = (job: Job, status: string) => {
    updateJob.mutate(
      { id: job.id, data: { status: status as import("@workspace/api-client-react").JobUpdateStatus } },
      {
        onSuccess: () => {
          toast({ title: `Moved to ${status}` });
          refetch();
          queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
        },
      }
    );
  };

  const grouped = PIPELINE_STATUSES.reduce<Record<string, Job[]>>((acc, s) => {
    acc[s] = jobs?.filter((j) => j.status === s) ?? [];
    return acc;
  }, {} as Record<string, Job[]>);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b bg-background">
        <h1 className="text-2xl font-bold">Applied</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your application pipeline</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PIPELINE_STATUSES.map((s) => (
              <Skeleton key={s} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {PIPELINE_STATUSES.map((status) => (
              <div key={status} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className={`px-4 py-3 border-b flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_COLORS[status]}>
                      {status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">{grouped[status].length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-24">
                  {grouped[status].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">None yet</p>
                  ) : (
                    grouped[status].map((job) => (
                      <div
                        key={job.id}
                        className="rounded-lg border bg-background p-3 cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <div className="font-medium text-sm">{job.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{job.company}</div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <Select
                            value={job.status}
                            onValueChange={(v) => handleStatusChange(job, v)}
                          >
                            <SelectTrigger
                              className="h-6 text-xs border-0 p-0 shadow-none focus:ring-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent onClick={(e) => e.stopPropagation()}>
                              {PIPELINE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {job.applyUrl && (
                            <a
                              href={job.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        {job.appliedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied {new Date(job.appliedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!jobs || jobs.length === 0) && (
          <div className="flex flex-col items-center gap-2 py-24 text-muted-foreground">
            <Briefcase size={32} className="opacity-40" />
            <p>No applications tracked yet. Mark jobs as Applied from the Dashboard.</p>
          </div>
        )}
      </div>

      <JobDetailsModal
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onStatusChange={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
        }}
      />
    </div>
  );
}
