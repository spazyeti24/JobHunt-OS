import { useState, useEffect, useRef } from "react";
import {
  useListRuns,
  useTriggerRun,
  useGetRun,
  useCancelRun,
  useGetRunSchedule,
  getGetRunQueryKey,
} from "@workspace/api-client-react";
import type { Run } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, Activity, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
  cancelling: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

function RunCard({ run, isActive }: { run: Run; isActive: boolean }) {
  const [logsOpen, setLogsOpen] = useState(isActive);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelRun = useCancelRun();
  const { toast } = useToast();

  const { data: liveRun } = useGetRun(run.id, {
    query: {
      queryKey: getGetRunQueryKey(run.id),
      enabled: isActive,
      refetchInterval: isActive ? 2000 : (false as const),
    },
  });

  const display = liveRun ?? run;
  const isCancelling = display.status === "cancelling";

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [display.logLines]);

  const handleCancel = () => {
    cancelRun.mutate({ id: run.id }, {
      onSuccess: () => {
        toast({ title: "Cancellation requested", description: "The run will stop after the current job finishes." });
      },
    });
  };

  const stat = (label: string, val: number | null | undefined) => (
    <div className="flex-1 text-center py-4 border-r last:border-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold">{val ?? "–"}</p>
    </div>
  );

  return (
    <div className={`rounded-xl border bg-card shadow-sm overflow-hidden ${isActive ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <Activity size={16} className={isActive ? "text-primary animate-pulse" : "text-muted-foreground"} />
          <span className="font-semibold">Run #{display.id}</span>
          <Badge variant="outline" className={STATUS_COLORS[display.status] ?? ""}>
            {isCancelling ? "Cancelling..." : display.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 border-rose-300 hover:bg-rose-50"
              onClick={handleCancel}
              disabled={isCancelling || cancelRun.isPending}
            >
              {isCancelling ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Cancelling...</>
              ) : (
                <><Square size={14} className="mr-1" /> Stop Run</>
              )}
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(display.startedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex divide-x border-b">
        {stat("Jobs Fetched", display.jobsFetched)}
        {stat("Jobs Scored", display.jobsScored)}
        {stat("Jobs Tailored", display.jobsTailored)}
      </div>

      {display.errorMessage && (
        <div className="px-5 py-3 bg-rose-50 border-b text-sm text-rose-700">
          {display.errorMessage}
        </div>
      )}

      <div>
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
          onClick={() => setLogsOpen((o) => !o)}
        >
          <span>Live Pipeline Logs</span>
          {logsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {logsOpen && (
          <div
            ref={logRef}
            className="bg-zinc-950 text-green-400 font-mono text-xs p-4 max-h-64 overflow-y-auto"
          >
            {display.logLines
              ? display.logLines.split("\n").map((line, i) => (
                  <div key={i} className={line.includes("ERROR") ? "text-rose-400" : line.includes("WARN") ? "text-amber-400" : "text-green-400"}>
                    {line}
                  </div>
                ))
              : <span className="text-zinc-500">Waiting for logs...</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function RunsPage() {
  const { data: runs, isLoading, refetch } = useListRuns();
  const { data: schedule } = useGetRunSchedule();
  const triggerRun = useTriggerRun();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeRun = runs?.find((r) => r.status === "running" || r.status === "cancelling");

  const handleTrigger = () => {
    triggerRun.mutate(undefined, {
      onSuccess: (result) => {
        toast({ title: "Run started", description: `Run #${result.runId} is now running.` });
        queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
        refetch();
      },
      onError: () => {
        toast({ title: "Failed to start run", variant: "destructive" });
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b bg-background flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run History</h1>
          <p className="text-muted-foreground text-sm mt-1">Logs and metrics from the automated job sourcing pipeline.</p>
          {schedule?.nextRunAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Next scheduled run: {new Date(schedule.nextRunAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button onClick={handleTrigger} disabled={!!activeRun || triggerRun.isPending} className="gap-2 mt-1">
          {triggerRun.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Trigger Manual Run
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
        ) : runs?.length === 0 ? (
          <div className="text-center text-muted-foreground py-24">
            No runs yet. Click "Trigger Manual Run" to start your first job search.
          </div>
        ) : (
          runs?.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              isActive={run.status === "running" || run.status === "cancelling"}
            />
          ))
        )}
      </div>
    </div>
  );
}
