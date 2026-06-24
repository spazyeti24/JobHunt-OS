import { 
  useGetJob,
  useUpdateJob,
  getGetJobQueryKey
} from "@workspace/api-client-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, DollarSign, ExternalLink, Target, AlertTriangle, FileText, Briefcase, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface JobDetailsModalProps {
  jobId: number | null;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function JobDetailsModal({ jobId, onClose, onStatusChange }: JobDetailsModalProps) {
  const { data: job, isLoading } = useGetJob(jobId || 0, {
    query: {
      enabled: !!jobId,
      queryKey: getGetJobQueryKey(jobId || 0)
    }
  });

  const updateJob = useUpdateJob();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleMarkApplied = () => {
    if (!jobId) return;
    updateJob.mutate({ id: jobId, data: { status: "Applied" } }, {
      onSuccess: () => {
        toast({ title: "Job marked as applied" });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
        onStatusChange?.();
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    if (score >= 60) return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    return "bg-rose-500/15 text-rose-700 border-rose-500/30";
  };

  return (
    <Sheet open={!!jobId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l shadow-2xl">
        {isLoading || !job ? (
          <div className="p-8 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="pt-8 space-y-4">
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 border-b bg-card">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">{job.title}</h2>
                  <div className="flex flex-wrap items-center text-muted-foreground gap-x-4 gap-y-2 text-sm">
                    <span className="flex items-center gap-1 font-medium text-foreground"><Building2 size={16} /> {job.company}</span>
                    <span className="flex items-center gap-1"><MapPin size={16} /> {job.location || 'Unknown'}</span>
                    {job.salary && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"><DollarSign size={16} /> {job.salary}</span>}
                    <span className="flex items-center gap-1"><Briefcase size={16} /> {job.employmentType}</span>
                    {job.isRemote && <Badge variant="secondary" className="font-normal text-xs">Remote</Badge>}
                  </div>
                </div>
                <Badge variant="outline" className={`text-xl px-3 py-1 font-mono border-2 ${getScoreColor(job.fitScore)}`}>
                  {job.fitScore}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                {job.applyUrl && (
                  <Button asChild size="sm" className="shadow-sm">
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                      Apply externally <ExternalLink size={14} className="ml-2" />
                    </a>
                  </Button>
                )}
                {!['Applied', 'Interviewing', 'Offer', 'Rejected'].includes(job.status) && (
                  <Button variant="secondary" size="sm" onClick={handleMarkApplied} disabled={updateJob.isPending}>
                    Mark as Applied
                  </Button>
                )}
                <Badge variant="outline" className="ml-auto opacity-70 font-normal">Source: {job.source}</Badge>
              </div>
            </div>

            <Tabs defaultValue="rationale" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 border-b bg-muted/20">
                <TabsList className="bg-transparent border-none h-12 w-full justify-start gap-6 p-0">
                  <TabsTrigger value="rationale" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-medium">AI Score Rationale</TabsTrigger>
                  <TabsTrigger value="resume" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-medium">Tailored Resume</TabsTrigger>
                  <TabsTrigger value="cover-letter" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-medium">Cover Letter</TabsTrigger>
                  <TabsTrigger value="jd" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-medium text-muted-foreground">Original JD</TabsTrigger>
                </TabsList>
              </div>
              
              <ScrollArea className="flex-1 p-6">
                <TabsContent value="rationale" className="m-0 space-y-6 outline-none">
                  {job.scoreRationale ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                        <h4 className="flex items-center gap-2 text-primary m-0 mb-2"><Target size={18} /> Analysis</h4>
                        <p className="m-0 text-foreground/80">{job.scoreRationale}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {job.mustHaveMatches && (
                          <div>
                            <h4 className="flex items-center gap-2 text-emerald-600 m-0 mb-3 border-b pb-2"><CheckCircle2 size={16} /> Strong Matches</h4>
                            <p className="text-sm whitespace-pre-wrap">{job.mustHaveMatches}</p>
                          </div>
                        )}
                        
                        {(job.gaps || job.redFlags) && (
                          <div className="space-y-6">
                            {job.gaps && (
                              <div>
                                <h4 className="flex items-center gap-2 text-amber-600 m-0 mb-3 border-b pb-2"><AlertTriangle size={16} /> Skill Gaps</h4>
                                <p className="text-sm whitespace-pre-wrap">{job.gaps}</p>
                              </div>
                            )}
                            {job.redFlags && (
                              <div>
                                <h4 className="flex items-center gap-2 text-rose-600 m-0 mb-3 border-b pb-2"><AlertTriangle size={16} /> Red Flags</h4>
                                <p className="text-sm whitespace-pre-wrap">{job.redFlags}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {job.topKeywords && (
                        <div className="mt-8 pt-6 border-t">
                          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Matched Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.topKeywords.split(',').map(kw => (
                              <Badge key={kw} variant="secondary" className="font-mono text-xs">{kw.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">No scoring rationale available.</div>
                  )}
                </TabsContent>

                <TabsContent value="resume" className="m-0 outline-none">
                  {job.tailoredResume ? (
                    <div className="bg-card border rounded-lg p-8 shadow-sm prose prose-sm dark:prose-invert max-w-none font-serif whitespace-pre-wrap">
                      {job.tailoredResume}
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center text-muted-foreground">
                      <FileText size={48} className="opacity-20 mb-4" />
                      <p>Resume has not been tailored for this job.</p>
                      <p className="text-sm mt-2 opacity-70">Requires a score above your settings threshold.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cover-letter" className="m-0 outline-none">
                  {job.coverLetter ? (
                    <div className="bg-card border rounded-lg p-8 shadow-sm prose prose-sm dark:prose-invert max-w-none font-serif whitespace-pre-wrap">
                      {job.coverLetter}
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center text-muted-foreground">
                      <FileText size={48} className="opacity-20 mb-4" />
                      <p>Cover letter has not been generated for this job.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="jd" className="m-0 outline-none">
                  {job.jobDescription ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b">
                        <div>
                          <p className="font-semibold text-base">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.company} · {job.location}</p>
                        </div>
                        {job.applyUrl && (
                          <Button asChild size="sm" variant="outline">
                            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                              View original <ExternalLink size={13} className="ml-1.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {job.jobDescription}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">Original description not available.</div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
