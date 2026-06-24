import { useState } from "react";
import { useListJobs, useGetJobStats, useDeleteJob } from "@workspace/api-client-react";
import type { Job, ListJobsLocationTypesItem } from "@workspace/api-client-react";
import { JobDetailsModal } from "@/components/job-details-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Briefcase, Star, CheckCircle, TrendingUp, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  Tailored: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Scored: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Applied: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  Interviewing: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Offer: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Rejected: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  Hidden: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
  "Below threshold": "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 font-semibold";
  if (score >= 60) return "text-amber-600 font-semibold";
  return "text-rose-500 font-semibold";
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const locationTypes = locationFilter === "all"
    ? undefined
    : [locationFilter as ListJobsLocationTypesItem];

  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useListJobs({
    search: search || undefined,
    locationTypes,
    statuses: statusFilter === "all" ? undefined : [statusFilter],
  });

  const { data: stats, isLoading: statsLoading } = useGetJobStats();
  const deleteJob = useDeleteJob();

  const handleDelete = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    deleteJob.mutate({ id: job.id }, {
      onSuccess: () => {
        toast({ title: "Job removed" });
        refetchJobs();
        queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b bg-background">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Your AI-powered job sourcing pipeline</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : stats ? (
            <>
              <StatCard label="Total Jobs" value={stats.total} icon={Briefcase} />
              <StatCard label="High Fit (≥80)" value={stats.highFit} icon={Star} sub="strong matches" />
              <StatCard label="Tailored" value={stats.tailored} icon={TrendingUp} sub="resume + cover letter ready" />
              <StatCard label="Applied" value={stats.applied} icon={CheckCircle} />
            </>
          ) : null}
        </div>

        {stats?.failedScoring ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle size={16} />
            {stats.failedScoring} jobs failed scoring — go to Run History to rescore them.
          </div>
        ) : null}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Location type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Tailored">Tailored</SelectItem>
              <SelectItem value="Scored">Scored</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="Interviewing">Interviewing</SelectItem>
              <SelectItem value="Offer">Offer</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Below threshold">Below threshold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Job Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Type</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : jobs?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    No jobs found. Trigger a run from Run History to fetch jobs.
                  </td>
                </tr>
              ) : (
                jobs?.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-xs text-muted-foreground">{job.company}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{job.location}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="capitalize text-muted-foreground">{job.workLocationType}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={scoreColor(job.fitScore)}>{job.fitScore}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_COLORS[job.status] ?? ""}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground capitalize">
                      {job.source ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, job)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JobDetailsModal
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onStatusChange={() => {
          refetchJobs();
          queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
        }}
      />
    </div>
  );
}
