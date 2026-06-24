import { useState, useRef } from "react";
import {
  useGetResume,
  useUpdateResume,
  useExtractResumeSkills,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Sparkles, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ResumeEditor() {
  const { data: resume, isLoading } = useGetResume();
  const updateResume = useUpdateResume();
  const extractSkills = useExtractResumeSkills();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [content, setContent] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayContent = content ?? resume?.content ?? "";

  const isDirty = content !== null && content !== resume?.content;

  const handleSave = () => {
    if (!isDirty) return;
    updateResume.mutate(
      { data: { content: displayContent } },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          toast({ title: "Resume saved", description: "Will apply to all future runs." });
          queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
          setContent(null);
        },
        onError: () => {
          toast({ title: "Save failed", variant: "destructive" });
        },
      }
    );
  };

  const handleExtractSkills = () => {
    extractSkills.mutate(
      { data: { resumeContent: displayContent } },
      {
        onSuccess: (result) => {
          const formatted = result.skills
            .map((cat) => `## ${cat.category}\n${cat.skills.map((s) => `- ${s}`).join("\n")}`)
            .join("\n\n");
          updateResume.mutate(
            { data: { content: displayContent, skills: formatted } },
            {
              onSuccess: () => {
                toast({ title: "Skills extracted and saved" });
                queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
              },
            }
          );
        },
        onError: () => {
          toast({ title: "Skill extraction failed", variant: "destructive" });
        },
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setContent(text);
      toast({ title: "File loaded", description: "Review and click Save to apply." });
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/resume/extract-pdf", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("PDF extraction failed");
        const { content: extracted } = await res.json();
        setContent(extracted);
        toast({ title: "PDF extracted", description: "Review the text and click Save." });
      } catch {
        toast({ title: "PDF extraction failed", variant: "destructive" });
      }
    } else {
      toast({ title: "Unsupported file type", description: "Upload a .pdf, .txt, or .md file.", variant: "destructive" });
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b bg-background">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Master Resume</h1>
            <p className="text-muted-foreground text-sm mt-1">
              This is the source of truth for all AI scoring and tailoring. Any changes apply to future runs.
            </p>
            {resume?.updatedAt && !isLoading && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Clock size={12} />
                Last updated: <span className="font-medium text-foreground">{formatDate(resume.updatedAt)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload size={15} />
              Upload / Replace Resume
            </Button>
            <Button
              variant="outline"
              onClick={handleExtractSkills}
              disabled={extractSkills.isPending || isLoading}
              className="gap-2"
            >
              {extractSkills.isPending ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Sparkles size={15} />
              )}
              Extract Skills
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateResume.isPending}
              className="gap-2"
            >
              {saveSuccess ? (
                <><CheckCircle2 size={15} /> Saved!</>
              ) : updateResume.isPending ? (
                <><RefreshCw size={15} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={15} /> Save Resume</>
              )}
            </Button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
            <CheckCircle2 size={15} />
            Resume saved — all future runs will use this version.
          </div>
        )}

        {isDirty && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            You have unsaved changes. Click Save Resume to apply them to future runs.
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="flex-1 rounded-xl min-h-96" />
        ) : (
          <>
            {resume?.skills && (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Extracted Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.split("\n")
                    .filter((l) => l.startsWith("- "))
                    .map((l) => l.slice(2).trim())
                    .map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              <Textarea
                value={displayContent}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 font-mono text-sm resize-none min-h-[500px] leading-relaxed"
                placeholder="Paste your resume in Markdown format, or upload a PDF above..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
